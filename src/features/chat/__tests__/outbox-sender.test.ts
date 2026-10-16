/**
 * Tests for G3.3 `chat.send` drain:
 * - text-only jobs confirm queued -> sent
 * - already-drained jobs skip the POST (exactly once, no duplicate)
 * - blocked peers throw loudly (Queued badge stays, never silent loss)
 * - invalid payloads throw (worker retries, then dead-letters)
 * - unknown kinds resolve without sending (no head-of-line block)
 * - full `drainOutbox` pass sends once; a second pass sends nothing
 */

import {
  defaultRelationship,
  setRelationship,
  type User,
} from "../../../entities/user";
import {
  countQueuedMessages,
  getMessageData,
  hydrateConversation,
  queueMessage,
} from "../../../entities/conversation";
import { createQueryClient } from "../../../shared/query/query-client";
import { queryKeys } from "../../../shared/query/query-keys";
import { drainOutbox } from "../../../shared/storage/db/outbox-worker";
import type { Conversation } from "../../../entities/conversation";
import {
  buildChatSendPayload,
  CHAT_OUTBOX_KIND,
  dispatchChatOutboxJob,
  handleChatSendJob,
  parseChatSendPayload,
} from "../outbox-sender";

const mockGetDatabase = jest.fn();

jest.mock("../../../shared/storage/db/client", () => ({
  getDatabase: () => mockGetDatabase(),
}));

const stubConversation: Conversation = {
  id: "c-1",
  title: "Ava Stone",
  participantIds: ["u-1"],
  lastMessagePreview: "See you tomorrow",
  lastMessageAt: "2026-09-09T10:00:00.000Z",
  unreadCount: 0,
};

function setupQc() {
  const qc = createQueryClient();
  hydrateConversation(qc, stubConversation);
  return qc;
}

function seedMe(qc: ReturnType<typeof createQueryClient>) {
  qc.setQueryData(queryKeys.me, { id: "me" } as User);
}

function queueOne(
  qc: ReturnType<typeof createQueryClient>,
  clientId: string,
  body = "offline hello",
) {
  return queueMessage(qc, "c-1", { body }, { clientId });
}

function payloadFor(clientId: string, body = "offline hello") {
  return buildChatSendPayload({
    conversationId: "c-1",
    body,
    imageUrl: null,
    localImageUri: null,
    clientId,
  });
}

function serverMessage() {
  return {
    id: "m-server-1",
    conversationId: "c-1",
    senderId: "me",
    body: "offline hello",
    imageUrl: null,
    status: "sent" as const,
    createdAt: "2026-09-09T12:00:00.000Z",
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("parseChatSendPayload", () => {
  it("accepts a valid text payload", () => {
    expect(parseChatSendPayload(payloadFor("c1"))).toEqual({
      conversationId: "c-1",
      body: "offline hello",
      imageUrl: null,
      localImageUri: null,
      clientId: "c1",
    });
  });

  it("accepts image-only payloads (remote url or local uri)", () => {
    const remote = parseChatSendPayload(
      buildChatSendPayload({
        conversationId: "c-1",
        body: "",
        imageUrl: "https://picsum.photos/seed/x/800/600",
        localImageUri: null,
        clientId: "img1",
      }),
    );
    expect(remote.imageUrl).toBe("https://picsum.photos/seed/x/800/600");
    const local = parseChatSendPayload(
      buildChatSendPayload({
        conversationId: "c-1",
        body: "",
        imageUrl: null,
        localImageUri: "file:///a.jpg",
        clientId: "img2",
      }),
    );
    expect(local.localImageUri).toBe("file:///a.jpg");
  });

  it("throws on non-JSON, bad shape, empty message, and bad clientId", () => {
    expect(() => parseChatSendPayload("nope")).toThrow();
    expect(() => parseChatSendPayload(JSON.stringify(null))).toThrow();
    expect(() =>
      parseChatSendPayload(
        buildChatSendPayload({
          conversationId: "",
          body: "hi",
          imageUrl: null,
          localImageUri: null,
          clientId: "c1",
        }),
      ),
    ).toThrow();
    expect(() =>
      parseChatSendPayload(
        buildChatSendPayload({
          conversationId: "c-1",
          body: "   ",
          imageUrl: null,
          localImageUri: null,
          clientId: "c1",
        }),
      ),
    ).toThrow();
    expect(() =>
      parseChatSendPayload(
        buildChatSendPayload({
          conversationId: "c-1",
          body: "hi",
          imageUrl: null,
          localImageUri: null,
          clientId: "",
        }),
      ),
    ).toThrow();
  });
});

describe("handleChatSendJob", () => {
  it("confirms queued -> sent on server ack", async () => {
    const qc = setupQc();
    seedMe(qc);
    const { messageId } = queueOne(qc, "k1");
    const sendRemote = jest.fn(async () => serverMessage());

    await handleChatSendJob(payloadFor("k1"), { qc, sendRemote });

    expect(sendRemote).toHaveBeenCalledTimes(1);
    expect(countQueuedMessages(qc, "c-1")).toBe(0);
    expect(getMessageData(qc, "c-1", "m-server-1")?.status).toBe("sent");
    expect(getMessageData(qc, "c-1", messageId)).toBeUndefined();
  });

  it("re-uploads a local image before posting", async () => {
    const qc = setupQc();
    seedMe(qc);
    queueMessage(
      qc,
      "c-1",
      { body: "", localImageUri: "file:///a.jpg" },
      { clientId: "img9" },
    );
    const upload = jest.fn(async () => ({
      url: "https://picsum.photos/seed/up/800/600",
      mediaId: "m-up",
    }));
    const sendRemote = jest.fn(async () => ({
      ...serverMessage(),
      id: "m-server-img",
      imageUrl: "https://picsum.photos/seed/up/800/600",
    }));

    await handleChatSendJob(
      buildChatSendPayload({
        conversationId: "c-1",
        body: "",
        imageUrl: null,
        localImageUri: "file:///a.jpg",
        clientId: "img9",
      }),
      { qc, upload, sendRemote },
    );

    expect(upload).toHaveBeenCalledTimes(1);
    expect(sendRemote).toHaveBeenCalledTimes(1);
    expect(getMessageData(qc, "c-1", "m-server-img")?.imageUrl).toBe(
      "https://picsum.photos/seed/up/800/600",
    );
  });

  it("skips the POST when already confirmed (exactly once)", async () => {
    const qc = setupQc();
    seedMe(qc);
    const sendRemote = jest.fn(async () => serverMessage());

    // No queued entry at all — a second drain pass after the first ack.
    await handleChatSendJob(payloadFor("gone"), { qc, sendRemote });

    expect(sendRemote).not.toHaveBeenCalled();
  });

  it("throws loudly for blocked peers without posting", async () => {
    const qc = setupQc();
    seedMe(qc);
    setRelationship(qc, { ...defaultRelationship("u-1"), blockedByMe: true });
    queueOne(qc, "blocked1");
    const sendRemote = jest.fn(async () => serverMessage());

    await expect(handleChatSendJob(payloadFor("blocked1"), { qc, sendRemote })).rejects.toThrow(
      "Bạn không thể nhắn tin cho người này.",
    );
    expect(sendRemote).not.toHaveBeenCalled();
    // Still queued — the badge stays visible, never a silent loss.
    expect(countQueuedMessages(qc, "c-1")).toBe(1);
  });
});

describe("dispatchChatOutboxJob", () => {
  it("drops unknown kinds without throwing", async () => {
    const qc = setupQc();
    await expect(
      dispatchChatOutboxJob({ kind: "post.create", payload: "{}" }, { qc }),
    ).resolves.toBeUndefined();
    expect(countQueuedMessages(qc, "c-1")).toBe(0);
  });
});

describe("drainOutbox with a chat.send job", () => {
  type Row = {
    id: string;
    kind: string;
    payload: string;
    status: string;
    attempts: number;
    created_at: number;
    updated_at: number;
  };

  function makeFakeDb(seed: Row[]) {
    const rows = [...seed];
    return {
      runAsync: jest.fn(async (sql: string, ...params: unknown[]) => {
        if (sql.startsWith("DELETE FROM outbox WHERE id = ?")) {
          const index = rows.findIndex((row) => row.id === params[0]);
          if (index >= 0) rows.splice(index, 1);
          return;
        }
        if (sql.startsWith("UPDATE outbox SET status = ?")) {
          const row = rows.find((candidate) => candidate.id === params[3]);
          if (row) {
            row.status = params[0] as string;
            row.attempts = params[1] as number;
            row.updated_at = params[2] as number;
          }
        }
      }),
      getAllAsync: jest.fn(async (sql: string) => {
        if (sql.includes("WHERE status = 'pending'")) {
          return rows
            .filter((row) => row.status === "pending")
            .sort((a, b) => a.created_at - b.created_at);
        }
        if (sql.startsWith("SELECT attempts FROM outbox")) return rows;
        return [];
      }),
    };
  }

  it("sends once; the next pass sends nothing (no duplicate)", async () => {
    const qc = setupQc();
    seedMe(qc);
    queueOne(qc, "drain1");
    mockGetDatabase.mockResolvedValue(
      makeFakeDb([
        {
          id: "job-1",
          kind: CHAT_OUTBOX_KIND,
          payload: payloadFor("drain1"),
          status: "pending",
          attempts: 0,
          created_at: 1,
          updated_at: 1,
        },
      ]),
    );
    const sendRemote = jest.fn(async () => serverMessage());
    const sender = (job: { kind: string; payload: string }) =>
      dispatchChatOutboxJob(job, { qc, sendRemote });

    const first = await drainOutbox(sender);
    expect(first).toEqual({ sent: 1, retried: 0, dead: 0 });
    expect(countQueuedMessages(qc, "c-1")).toBe(0);
    expect(getMessageData(qc, "c-1", "m-server-1")?.status).toBe("sent");

    const second = await drainOutbox(sender);
    expect(second).toEqual({ sent: 0, retried: 0, dead: 0 });
    expect(sendRemote).toHaveBeenCalledTimes(1);
    const data = qc.getQueryData<{ pages: { ids: string[] }[] }>([
      "conversations",
      "c-1",
      "messages",
    ]);
    const ids = (data?.pages ?? []).flatMap((page) => page.ids);
    expect(ids.filter((id) => id === "m-server-1")).toHaveLength(1);
  });
});

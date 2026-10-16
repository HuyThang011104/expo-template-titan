/**
 * G3.1 tests: text + image 1-1 with sending -> sent -> seen,
 * live dedup, and image-only preview.
 */

import { createQueryClient } from "../../../shared/query/query-client";
import { createMockFetch } from "../../../shared/api/mock-handlers";
import { sendMessageRemote } from "../api";
import {
  getConversationData,
  getMessageData,
  hydrateConversation,
  hydrateMessage,
  markMessagesSeen,
  sendMessage,
  upsertIncomingMessage,
} from "../cache";
import { parseMessage } from "../schema";
import { mockConversation1 } from "../__fixtures__";

describe("G3.1 chat text + image", () => {
  it("parses legacy payloads without image/status (defaults)", () => {
    const parsed = parseMessage({
      id: "m-old",
      conversationId: "c-1",
      senderId: "u-1",
      body: "legacy",
      createdAt: "2026-09-09T10:00:00.000Z",
    });
    expect(parsed?.imageUrl).toBeNull();
    expect(parsed?.status).toBe("sent");
  });

  it("sends image-only with sent status and [Ảnh] preview", async () => {
    const qc = createQueryClient();
    const fetchImpl = createMockFetch({ delayMs: 0 });
    hydrateConversation(qc, mockConversation1);

    await sendMessage(
      qc,
      "c-1",
      { body: "", imageUrl: "https://picsum.photos/seed/g31/800/600" },
      { sendRemote: (convId, input) => sendMessageRemote(convId, input, { fetchImpl }) },
    );

    const data = qc.getQueryData<{ pages: { ids: string[] }[] }>([
      "conversations",
      "c-1",
      "messages",
    ]);
    const ids = (data?.pages ?? []).flatMap((page) => page.ids);
    expect(ids.length).toBe(1);
    const stored = getMessageData(qc, "c-1", ids[0] ?? "");
    expect(stored?.imageUrl).toBe("https://picsum.photos/seed/g31/800/600");
    expect(stored?.status).toBe("sent");
    expect(getConversationData(qc, "c-1")?.lastMessagePreview).toBe("[Ảnh]");
  });

  it("live incoming does not duplicate and own echo never bumps unread", () => {
    const qc = createQueryClient();
    hydrateConversation(qc, { ...mockConversation1, unreadCount: 0 });
    const incoming = {
      id: "m-live-dedup",
      conversationId: "c-1",
      senderId: "u-1",
      body: "hello live",
      imageUrl: null,
      status: "sent" as const,
      createdAt: "2026-09-09T11:00:00.000Z",
    };
    upsertIncomingMessage(qc, incoming);
    upsertIncomingMessage(qc, incoming);
    // Canonical entry exists once; live id appended once; unread bumps once.
    expect(getMessageData(qc, "c-1", "m-live-dedup")?.body).toBe("hello live");
    const livePages = qc.getQueryData<{ pages: { ids: string[] }[] }>([
      "conversations",
      "c-1",
      "messages",
    ]);
    const liveIds = (livePages?.pages ?? []).flatMap((page) => page.ids);
    expect(liveIds.filter((id) => id === "m-live-dedup").length).toBe(1);
    expect(getConversationData(qc, "c-1")?.unreadCount).toBe(1);

    hydrateMessage(qc, {
      id: "m-own-echo",
      conversationId: "c-1",
      senderId: "me",
      body: "echo",
      imageUrl: null,
      status: "sent" as const,
      createdAt: "2026-09-09T11:01:00.000Z",
    });
    const before = getConversationData(qc, "c-1")?.unreadCount ?? -1;
    upsertIncomingMessage(qc, {
      id: "m-own-echo",
      conversationId: "c-1",
      senderId: "me",
      body: "echo",
      imageUrl: null,
      status: "sent" as const,
      createdAt: "2026-09-09T11:01:00.000Z",
    });
    expect(getConversationData(qc, "c-1")?.unreadCount).toBe(before);
  });

  it("opening the thread flips sent -> seen", async () => {
    const qc = createQueryClient();
    const fetchImpl = createMockFetch({ delayMs: 0 });
    hydrateConversation(qc, mockConversation1);
    await sendMessage(qc, "c-1", "peer will read this", {
      sendRemote: (convId, input) => sendMessageRemote(convId, input, { fetchImpl }),
    });
    const data = qc.getQueryData<{ pages: { ids: string[] }[] }>([
      "conversations",
      "c-1",
      "messages",
    ]);
    const ids = (data?.pages ?? []).flatMap((page) => page.ids);
    expect(getMessageData(qc, "c-1", ids[0] ?? "")?.status).toBe("sent");
    const flipped = markMessagesSeen(qc, "c-1");
    expect(flipped).toBe(1);
    expect(getMessageData(qc, "c-1", ids[0] ?? "")?.status).toBe("seen");
  });
});

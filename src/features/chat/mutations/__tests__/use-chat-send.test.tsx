/**
 * Tests for G3.3 `useChatSend`:
 * - online tap sends via the entity (no outbox job)
 * - offline tap queues once (`Queued` badge) + enqueues one `chat.send` job
 * - blocked peer throws a clear message without queueing
 */

import { act, renderHook } from "@testing-library/react-native";
import { onlineManager, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import {
  defaultRelationship,
  setRelationship,
  type User,
} from "../../../../entities/user";
import {
  countQueuedMessages,
  getMessageData,
  hydrateConversation,
  type Conversation,
} from "../../../../entities/conversation";
import { createMockFetch } from "../../../../shared/api/mock-handlers";
import { createQueryClient } from "../../../../shared/query/query-client";
import { queryKeys } from "../../../../shared/query/query-keys";
import { enqueueOutboxJob } from "../../../../shared/storage/db/outbox";
import { CHAT_OUTBOX_KIND } from "../../outbox-sender";
import { useChatSend } from "../use-chat-send";

jest.mock("../../../../shared/storage/db/outbox", () => ({
  enqueueOutboxJob: jest.fn(async () => "job-1"),
}));

const mockedEnqueue = enqueueOutboxJob as jest.Mock;

const stubConversation: Conversation = {
  id: "c-1",
  title: "Ava Stone",
  participantIds: ["u-1"],
  lastMessagePreview: "See you tomorrow",
  lastMessageAt: "2026-09-09T10:00:00.000Z",
  unreadCount: 0,
};

function setup(fetchImpl: typeof fetch = createMockFetch({ delayMs: 0 })) {
  const qc = createQueryClient();
  hydrateConversation(qc, stubConversation);
  qc.setQueryData(queryKeys.me, { id: "me" } as User);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return { qc, fetchImpl, wrapper };
}

beforeEach(() => {
  jest.clearAllMocks();
  onlineManager.setOnline(true);
});

afterEach(() => {
  onlineManager.setOnline(true);
});

describe("useChatSend", () => {
  it("sends online without touching the outbox", async () => {
    const { wrapper, qc, fetchImpl } = setup();
    const { result } = await renderHook(() => useChatSend("c-1", { fetchImpl }), {
      wrapper,
    });

    let status = "";
    await act(async () => {
      const out = await result.current.send({ body: "hello online" });
      status = out.status;
    });

    expect(status).toBe("sent");
    expect(mockedEnqueue).not.toHaveBeenCalled();
    expect(countQueuedMessages(qc, "c-1")).toBe(0);
  });

  it("queues offline with one outbox job and a Queued badge entry", async () => {
    onlineManager.setOnline(false);
    const { wrapper, qc, fetchImpl } = setup();
    const { result } = await renderHook(() => useChatSend("c-1", { fetchImpl }), {
      wrapper,
    });

    let messageId = "";
    await act(async () => {
      const out = await result.current.send({ body: "hello offline" });
      if (out.status !== "queued") throw new Error("expected queued");
      messageId = out.messageId;
    });

    expect(mockedEnqueue).toHaveBeenCalledTimes(1);
    expect(mockedEnqueue).toHaveBeenCalledWith(
      CHAT_OUTBOX_KIND,
      expect.stringContaining('"conversationId":"c-1"'),
    );
    expect(getMessageData(qc, "c-1", messageId)?.status).toBe("queued");
    expect(countQueuedMessages(qc, "c-1")).toBe(1);
  });

  it("blocked peer reports the loud message and never enqueues", async () => {
    const { wrapper, qc, fetchImpl } = setup();
    setRelationship(qc, { ...defaultRelationship("u-1"), blockedByMe: true });
    const { result } = await renderHook(() => useChatSend("c-1", { fetchImpl }), {
      wrapper,
    });

    await act(async () => {
      await expect(result.current.send({ body: "hi blocked" })).rejects.toThrow(
        "Bạn không thể nhắn tin cho người này.",
      );
    });
    expect(mockedEnqueue).not.toHaveBeenCalled();
    expect(countQueuedMessages(qc, "c-1")).toBe(0);
  });
});

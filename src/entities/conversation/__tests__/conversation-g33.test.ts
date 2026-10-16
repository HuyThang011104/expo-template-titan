/**
 * G3.3 entity tests: `queued` status + offline queue/confirm (drain-once).
 */

import { createQueryClient } from "../../../shared/query/query-client";
import {
  confirmQueuedMessage,
  countQueuedMessages,
  getMessageData,
  getQueuedMessage,
  hydrateConversation,
  markMessagesSeen,
  queueMessage,
  upsertIncomingMessage,
} from "../cache";
import { parseMessage } from "../schema";
import { mockConversation1 } from "../__fixtures__";

describe("G3.3 offline queue", () => {
  it("parses the queued status from local payloads", () => {
    const parsed = parseMessage({
      id: "queued-abc",
      conversationId: "c-1",
      senderId: "me",
      body: "offline hi",
      imageUrl: null,
      status: "queued",
      createdAt: "2026-09-09T11:00:00.000Z",
    });
    expect(parsed?.status).toBe("queued");
  });

  it("queues one entry per tap with a Queued badge count", () => {
    const qc = createQueryClient();
    hydrateConversation(qc, { ...mockConversation1, unreadCount: 0 });
    const first = queueMessage(qc, "c-1", { body: "offline one" }, { clientId: "a1", now: 1000 });
    const second = queueMessage(qc, "c-1", { body: "offline two" }, { clientId: "a2", now: 2000 });
    expect(first.messageId).toBe("queued-a1");
    expect(second.messageId).toBe("queued-a2");
    expect(countQueuedMessages(qc, "c-1")).toBe(2);
    expect(getQueuedMessage(qc, "c-1", "queued-a1")?.body).toBe("offline one");
    // Own queued message never bumps the unread badge.
    expect(qc.getQueryData<{ unreadCount: number }>(["conversations", "c-1"])).toMatchObject({
      unreadCount: 0,
    });
  });

  it("confirm swaps queued -> sent exactly once (second drain is a no-op)", () => {
    const qc = createQueryClient();
    hydrateConversation(qc, { ...mockConversation1, unreadCount: 0 });
    const { messageId } = queueMessage(qc, "c-1", { body: "drain me" }, { clientId: "d1" });
    const server = {
      id: "m-server-1",
      conversationId: "c-1",
      senderId: "me",
      body: "drain me",
      imageUrl: null,
      status: "sent" as const,
      createdAt: "2026-09-09T12:00:00.000Z",
    };
    confirmQueuedMessage(qc, "c-1", messageId, server);
    expect(countQueuedMessages(qc, "c-1")).toBe(0);
    expect(getMessageData(qc, "c-1", "m-server-1")?.status).toBe("sent");
    expect(getMessageData(qc, "c-1", messageId)).toBeUndefined();
    // Idempotent: confirming again never duplicates.
    confirmQueuedMessage(qc, "c-1", messageId, server);
    const data = qc.getQueryData<{ pages: { ids: string[] }[] }>([
      "conversations",
      "c-1",
      "messages",
    ]);
    const ids = (data?.pages ?? []).flatMap((page) => page.ids);
    expect(ids.filter((id) => id === "m-server-1")).toHaveLength(1);
    expect(ids).not.toContain(messageId);
  });

  it("seen flip skips queued entries; incoming queued normalizes to sent", () => {
    const qc = createQueryClient();
    hydrateConversation(qc, { ...mockConversation1, unreadCount: 0 });
    queueMessage(qc, "c-1", { body: "still offline" }, { clientId: "q1" });
    expect(markMessagesSeen(qc, "c-1")).toBe(0);
    upsertIncomingMessage(qc, {
      id: "m-wire-q",
      conversationId: "c-1",
      senderId: "u-1",
      body: "peer",
      imageUrl: null,
      status: "queued",
      createdAt: "2026-09-09T12:01:00.000Z",
    });
    expect(getMessageData(qc, "c-1", "m-wire-q")?.status).toBe("sent");
  });
});

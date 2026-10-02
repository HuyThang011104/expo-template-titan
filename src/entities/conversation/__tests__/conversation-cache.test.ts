/**
 * Tests for F4 conversation cache: canonical entries, optimistic
 * send with server-wins + rollback, incoming socket upsert.
 */

import { createQueryClient } from "../../../shared/query/query-client";
import { createMockFetch } from "../../../shared/api/mock-handlers";
import { sendMessageRemote } from "../api";
import {
  getConversationData,
  getMessageData,
  hydrateConversation,
  hydrateMessage,
  markConversationRead,
  sendMessage,
  upsertIncomingMessage,
} from "../cache";
import { mockConversation1, mockMessage1 } from "../__fixtures__";

describe("conversation cache", () => {
  it("hydrates the canonical conversation", () => {
    const qc = createQueryClient();
    const { conversationId } = hydrateConversation(qc, mockConversation1);
    expect(conversationId).toBe("c-1");
    expect(getConversationData(qc, "c-1")?.unreadCount).toBe(2);
  });

  it("send appends the server message and updates the preview", async () => {
    const qc = createQueryClient();
    const fetchImpl = createMockFetch({ delayMs: 0 });
    hydrateConversation(qc, mockConversation1);

    await sendMessage(qc, "c-1", "hello from test", {
      sendRemote: (convId, body) => sendMessageRemote(convId, body, { fetchImpl }),
    });

    const data = qc.getQueryData<{ pages: { ids: string[] }[] }>(["conversations", "c-1", "messages"]);
    const ids = (data?.pages ?? []).flatMap((page) => page.ids);
    expect(ids.length).toBe(1);
    const stored = getMessageData(qc, "c-1", ids[0] ?? "");
    expect(stored?.body).toBe("hello from test");
    expect(getConversationData(qc, "c-1")?.lastMessagePreview).toContain("hello");
  });

  it("send rolls back for the forced-failure conversation", async () => {
    const qc = createQueryClient();
    const fetchImpl = createMockFetch({ delayMs: 0 });
    hydrateConversation(qc, { ...mockConversation1, id: "c-fail" });

    await sendMessage(qc, "c-fail", "this will fail", {
      sendRemote: (convId, body) => sendMessageRemote(convId, body, { fetchImpl }),
    });

    const data = qc.getQueryData<{ pages: { ids: string[] }[] }>([
      "conversations",
      "c-fail",
      "messages",
    ]);
    const ids = (data?.pages ?? []).flatMap((page) => page.ids);
    expect(ids).toEqual([]);
  });

  it("upsertIncomingMessage hydrates and bumps unread", () => {
    const qc = createQueryClient();
    hydrateConversation(qc, mockConversation1);
    hydrateMessage(qc, mockMessage1);
    upsertIncomingMessage(qc, {
      id: "m-live",
      conversationId: "c-1",
      senderId: "u-1",
      body: "live socket message",
      createdAt: "2026-09-09T11:00:00.000Z",
    });

    expect(getMessageData(qc, "c-1", "m-live")?.body).toBe("live socket message");
    expect(getConversationData(qc, "c-1")?.unreadCount).toBe(3);
    markConversationRead(qc, "c-1");
    expect(getConversationData(qc, "c-1")?.unreadCount).toBe(0);
  });
});

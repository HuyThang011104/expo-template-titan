/**
 * G3.2 tests: typing TTL + online presence + seen/read receipts.
 */

import { createMockFetch } from "../../../shared/api/mock-handlers";
import { createQueryClient } from "../../../shared/query/query-client";
import { fetchPresence } from "../api";
import {
  getConversationData,
  getMessageData,
  getPresenceData,
  hydrateConversation,
  hydrateMessage,
  isTypingIn,
  markConversationRead,
  markMessagesSeen,
  markThreadRead,
  pruneExpiredTyping,
  setPresence,
  upsertPresence,
  upsertTypingStarted,
  upsertTypingStopped,
} from "../cache";
import { parseMessageSeenPayload, parsePresence, parseTypingPayload } from "../schema";
import { mockConversation1, mockPresenceOffline, mockPresenceOnline } from "../__fixtures__";

describe("G3.2 typing + online + seen", () => {
  it("parses presence with defaults and the typingInConvId alias", () => {
    const parsed = parsePresence({
      userId: "u-1",
      online: true,
      lastSeenAt: null,
    });
    expect(parsed?.typingInConversationId).toBeNull();
    expect(parsed?.typingExpiresAt).toBeNull();

    const aliased = parsePresence({
      userId: "u-1",
      online: true,
      lastSeenAt: null,
      typingInConvId: "c-1",
    });
    expect(aliased?.typingInConversationId).toBe("c-1");
    // Typing without expiry defaults to a future TTL (auto-clear).
    expect(aliased?.typingExpiresAt).not.toBeNull();
  });

  it("typing shows then expires a few seconds after the peer stops", () => {
    const qc = createQueryClient();
    const now = Date.parse("2026-09-09T11:00:00.000Z");
    upsertTypingStarted(qc, "c-1", "u-1", 5_000, now);
    expect(isTypingIn(getPresenceData(qc, "u-1"), "c-1", now + 1_000)).toBe(true);
    // Other threads never show this typing.
    expect(isTypingIn(getPresenceData(qc, "u-1"), "c-2", now + 1_000)).toBe(false);
    // TTL lapses -> idle, and prune drops the stale entry.
    expect(isTypingIn(getPresenceData(qc, "u-1"), "c-1", now + 5_001)).toBe(false);
    pruneExpiredTyping(qc, "u-1", now + 5_001);
    expect(getPresenceData(qc, "u-1")?.typingInConversationId).toBeNull();
  });

  it("stale stop events never kill typing in the current thread", () => {
    const qc = createQueryClient();
    const now = Date.now();
    upsertTypingStarted(qc, "c-2", "u-1", 5_000, now);
    upsertTypingStopped(qc, "c-1", "u-1");
    expect(isTypingIn(getPresenceData(qc, "u-1"), "c-2", now + 100)).toBe(true);
    upsertTypingStopped(qc, "c-2", "u-1");
    expect(isTypingIn(getPresenceData(qc, "u-1"), "c-2", now + 100)).toBe(false);
  });

  it("typing preserves online state and presence updates overwrite", () => {
    const qc = createQueryClient();
    setPresence(qc, mockPresenceOffline);
    upsertTypingStarted(qc, "c-1", "u-2");
    expect(getPresenceData(qc, "u-2")?.online).toBe(false);
    expect(isTypingIn(getPresenceData(qc, "u-2"), "c-1")).toBe(true);
    upsertPresence(qc, mockPresenceOnline);
    expect(getPresenceData(qc, "u-1")?.online).toBe(true);
  });

  it("parses typing + message.seen socket payloads, rejects junk", () => {
    expect(parseTypingPayload({ conversationId: "c-1", userId: "u-1" })).toEqual({
      conversationId: "c-1",
      userId: "u-1",
    });
    expect(parseTypingPayload({ nope: true })).toBeNull();
    expect(parseMessageSeenPayload({ conversationId: "c-1" })?.conversationId).toBe("c-1");
    expect(
      parseMessageSeenPayload({ conversationId: "c-1", messageIds: ["m-1"] })?.messageIds,
    ).toEqual(["m-1"]);
    expect(parseMessageSeenPayload({ nope: true })).toBeNull();
  });

  it("opening a thread clears the badge and flips sent -> seen (sending untouched)", async () => {
    const qc = createQueryClient();
    hydrateConversation(qc, { ...mockConversation1, unreadCount: 3 });
    hydrateMessage(qc, {
      id: "m-sent-1",
      conversationId: "c-1",
      senderId: "u-1",
      body: "hello",
      imageUrl: null,
      status: "sent",
      createdAt: "2026-09-09T11:00:00.000Z",
    });
    hydrateMessage(qc, {
      id: "m-sending-1",
      conversationId: "c-1",
      senderId: "me",
      body: "uploading",
      imageUrl: null,
      status: "sending",
      createdAt: "2026-09-09T11:01:00.000Z",
    });

    const { flipped, synced } = await markThreadRead(qc, "c-1", {
      markReadRemote: () => Promise.resolve(true),
    });
    expect(flipped).toBe(1);
    expect(synced).toBe(true);
    expect(getConversationData(qc, "c-1")?.unreadCount).toBe(0);
    expect(getMessageData(qc, "c-1", "m-sent-1")?.status).toBe("seen");
    expect(getMessageData(qc, "c-1", "m-sending-1")?.status).toBe("sending");
    // Repeat open is idempotent.
    expect(markMessagesSeen(qc, "c-1")).toBe(0);
    markConversationRead(qc, "c-1");
    expect(getConversationData(qc, "c-1")?.unreadCount).toBe(0);
  });

  it("fetches presence from the mock api", async () => {
    const fetchImpl = createMockFetch({ delayMs: 0 });
    const presence = await fetchPresence("u-1", { fetchImpl });
    expect(presence?.userId).toBe("u-1");
    expect(typeof presence?.online).toBe("boolean");
  });
});

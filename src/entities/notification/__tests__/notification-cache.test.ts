/**
 * Tests for F5.0 notification cache: canonical entry, optimistic
 * mark-read with server-wins + rollback, mark-all-visible, unread count.
 */

import { createQueryClient } from "../../../shared/query/query-client";
import { createMockFetch } from "../../../shared/api/mock-handlers";
import {
  countUnread,
  getNotificationData,
  hydrateNotification,
  markAllReadVisible,
  markRead,
} from "../cache";
import { markNotificationReadRemote } from "../api";
import type { Notification } from "../model";

function unreadFixture(id: string): Notification {
  return {
    id,
    kind: "like",
    actorId: "u-1",
    postId: "feed-p-1",
    read: false,
    createdAt: "2026-09-09T10:00:00.000Z",
  };
}

describe("notification cache", () => {
  it("hydrates the canonical entry", () => {
    const qc = createQueryClient();
    const { notificationId } = hydrateNotification(qc, unreadFixture("n-x"));
    expect(notificationId).toBe("n-x");
    expect(getNotificationData(qc, "n-x")?.read).toBe(false);
  });

  it("markRead flips to read and keeps the server response", async () => {
    const qc = createQueryClient();
    const fetchImpl = createMockFetch({ delayMs: 0 });
    hydrateNotification(qc, unreadFixture("n-1"));

    await markRead(qc, "n-1", {
      markReadRemote: (notificationId) => markNotificationReadRemote(notificationId, { fetchImpl }),
    });

    expect(getNotificationData(qc, "n-1")?.read).toBe(true);
  });

  it("markRead rolls back for the forced-failure notification", async () => {
    const qc = createQueryClient();
    const fetchImpl = createMockFetch({ delayMs: 0 });
    hydrateNotification(qc, unreadFixture("n-fail"));

    await markRead(qc, "n-fail", {
      markReadRemote: (notificationId) => markNotificationReadRemote(notificationId, { fetchImpl }),
    });

    expect(getNotificationData(qc, "n-fail")?.read).toBe(false);
  });

  it("markAllReadVisible flips loaded pages and countUnread drops to zero", () => {
    const qc = createQueryClient();
    hydrateNotification(qc, unreadFixture("n-1"));
    hydrateNotification(qc, { ...unreadFixture("n-2"), read: true });
    // Seed a loaded list page (ids only, like useNotifications returns).
    qc.setQueryData(["notifications"], {
      pages: [{ ids: ["n-1", "n-2"], nextCursor: null }],
      pageParams: [null],
    });

    expect(countUnread(qc)).toBe(1);
    const flipped = markAllReadVisible(qc);
    expect(flipped).toEqual(["n-1"]);
    expect(countUnread(qc)).toBe(0);
    expect(getNotificationData(qc, "n-1")?.read).toBe(true);
  });
});

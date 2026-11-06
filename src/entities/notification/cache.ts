/**
 * Notification canonical cache (F5).
 *
 * - Only file allowed to `setQueryData(queryKeys.notification…)` or patch the
 *   notifications id list. Features call these helpers, never `setQueryData` directly.
 * - `hydrateNotification` writes the canonical entry; lists hold ids only.
 * - `markRead` is read → optimistic read:true → server wins → rollback.
 * - `markAllReadVisible` optimistically flips every loaded page (server sync
 *   happens in the mutation; partial failures only warn, see queries.ts).
 */

import type { InfiniteData, QueryClient } from "@tanstack/react-query";

import { logger } from "@/shared/observability/logger";
import { queryKeys } from "@/shared/query";

import { markNotificationReadRemote } from "./api";
import type { Notification } from "./model";

export type NotificationsPageShape = {
  ids: string[];
  nextCursor: string | null;
};

/** Overwrite the canonical notification. */
export function setNotification(qc: QueryClient, notification: Notification): void {
  qc.setQueryData(queryKeys.notification(notification.id), notification);
}

/** Read the canonical notification (no fetch). */
export function getNotificationData(
  qc: QueryClient,
  id: string,
): Notification | undefined {
  return qc.getQueryData<Notification>(queryKeys.notification(id));
}

/**
 * Merge a patch into the canonical entry; `undefined` when missing.
 */
export function patchNotification(
  qc: QueryClient,
  id: string,
  patch: Partial<Notification>,
): Notification | undefined {
  const prev = getNotificationData(qc, id);
  if (!prev) return undefined;
  const next: Notification = { ...prev, ...patch };
  qc.setQueryData(queryKeys.notification(id), next);
  return next;
}

/**
 * Hydrate one wire notification; returns `{ notificationId }`.
 */
export function hydrateNotification(
  qc: QueryClient,
  notification: Notification,
): { notificationId: string } {
  setNotification(qc, notification);
  return { notificationId: notification.id };
}

export type MarkReadRemoteFn = typeof markNotificationReadRemote;

export type MarkReadOptions = {
  markReadRemote?: MarkReadRemoteFn;
};

/**
 * Mark one notification read with optimistic update; all callers must use this.
 */
export async function markRead(
  qc: QueryClient,
  id: string,
  opts: MarkReadOptions = {},
): Promise<void> {
  const prev = getNotificationData(qc, id);
  // No canonical entry → skip here, do not fetch.
  if (!prev) return;
  if (prev.read) return;

  patchNotification(qc, id, { read: true });

  const remote = opts.markReadRemote ?? markNotificationReadRemote;
  try {
    const server = await remote(id);
    // Server wins on a valid notification; `null` means failure → rollback.
    if (server) {
      setNotification(qc, server);
      return;
    }
  } catch {
    // Fall through to rollback below.
  }
  setNotification(qc, prev);
  logger.warn("[notification] mark-read failed, rolled back", { notificationId: id });
}

/**
 * Optimistically flip every loaded list entry to read:true.
 * Returns the ids that were flipped (for logging / server sync).
 */
export function markAllReadVisible(qc: QueryClient): string[] {
  const data = qc.getQueryData<InfiniteData<NotificationsPageShape, string | null>>(
    queryKeys.notifications(),
  );
  if (!data) return [];
  const flipped: string[] = [];
  for (const page of data.pages) {
    for (const id of page.ids) {
      if (getNotificationData(qc, id)?.read === false) {
        patchNotification(qc, id, { read: true });
        flipped.push(id);
      }
    }
  }
  return flipped;
}

/** Count unread across loaded list pages (no fetch). */
export function countUnread(qc: QueryClient): number {
  const data = qc.getQueryData<InfiniteData<NotificationsPageShape, string | null>>(
    queryKeys.notifications(),
  );
  if (!data) return 0;
  let count = 0;
  for (const page of data.pages) {
    for (const id of page.ids) {
      if (getNotificationData(qc, id)?.read === false) count += 1;
    }
  }
  return count;
}

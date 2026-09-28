/**
 * Notification queries (F5).
 *
 * - `useNotification` mirrors `usePost` with `queryKeys.notification(id)`.
 * - `useNotifications` is the infinite inbox list; pages hold ids only.
 * - `useMarkNotificationRead` wraps `markRead` with no extra handlers or retry.
 * - `useMarkAllNotificationsRead` flips visible pages optimistically, syncs
 *   each id best-effort (`allSettled`, partial failures only warn), then
 *   invalidates once. No rollback: a failed sync re-shows unread on refetch.
 */

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Href } from "expo-router";

import { logger } from "@/shared/observability/logger";
import { queryKeys } from "@/shared/query";
import type { QueryClient } from "@tanstack/react-query";

import { hrefs } from "@/shared/navigation/hrefs";

import {
  fetchNotification,
  fetchNotificationsPageWire,
  markNotificationReadRemote,
} from "./api";
import {
  countUnread,
  hydrateNotification,
  markAllReadVisible,
  markRead,
} from "./cache";
import { parseNotification } from "./schema";
import type { Notification } from "./model";

export type QueryFetchOptions = {
  fetchImpl?: typeof fetch;
};

export type NotificationsPage = {
  ids: string[];
  nextCursor: string | null;
};

async function toPage(
  qc: QueryClient,
  cursor: string | null,
  opts: QueryFetchOptions,
): Promise<NotificationsPage> {
  const wire = await fetchNotificationsPageWire(cursor, opts);
  if (!wire) {
    logger.warn("[notification] invalid page", { cursor });
    throw new Error("[notification] Invalid notifications page");
  }
  const ids: string[] = [];
  for (const item of wire.items) {
    const parsed = parseNotification(item);
    if (!parsed) continue;
    ids.push(hydrateNotification(qc, parsed).notificationId);
  }
  return { ids, nextCursor: wire.nextCursor };
}

export function useNotification(id: string, opts: QueryFetchOptions = {}) {
  return useQuery({
    queryKey: queryKeys.notification(id),
    queryFn: async () => {
      const notification = await fetchNotification(id, opts);
      if (!notification) throw new Error(`Invalid notification ${id}`);
      return notification;
    },
    staleTime: 30_000,
    enabled: id.length > 0,
  });
}

export function useNotifications(opts: QueryFetchOptions = {}) {
  const qc = useQueryClient();
  const infinite = useInfiniteQuery({
    queryKey: queryKeys.notifications(),
    queryFn: ({ pageParam }) => toPage(qc, pageParam, opts),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage: NotificationsPage) => lastPage.nextCursor ?? undefined,
  });

  const notificationIds = (infinite.data?.pages ?? []).flatMap((page) => page.ids);
  const unreadCount = countUnread(qc);

  return { ...infinite, notificationIds, unreadCount };
}

export function useUnreadCount(opts: QueryFetchOptions = {}): number {
  const { unreadCount } = useNotifications(opts);
  return unreadCount;
}

export function useMarkNotificationRead(id: string, opts: QueryFetchOptions = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      markRead(qc, id, {
        markReadRemote: (notificationId) => markNotificationReadRemote(notificationId, opts),
      }),
  });
}

export function useMarkAllNotificationsRead(opts: QueryFetchOptions = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<{ synced: number; failed: number }> => {
      const ids = markAllReadVisible(qc);
      const results = await Promise.allSettled(
        ids.map((notificationId) => markNotificationReadRemote(notificationId, opts)),
      );
      const failed = results.filter((result) => result.status === "rejected").length;
      if (failed > 0) {
        logger.warn("[notification] mark-all partially failed", {
          synced: ids.length - failed,
          failed,
        });
      }
      return { synced: ids.length - failed, failed };
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.notifications() });
    },
  });
}

/**
 * Resolve the tap target for a notification.
 * Post-bearing kinds go to the post; follow goes to the actor's profile
 * (handle read from the canonical user cache; missing → null + warn, no crash).
 */
export function resolveNotificationHref(
  qc: QueryClient,
  notification: Notification,
): Href | null {
  if (notification.postId) return hrefs.post(notification.postId);
  const actor = qc.getQueryData<{ handle?: unknown }>(
    queryKeys.user(notification.actorId),
  );
  if (actor && typeof actor.handle === "string" && actor.handle.length > 0) {
    return hrefs.user(actor.handle);
  }
  logger.warn("[notification] no target for follow notification", {
    notificationId: notification.id,
  });
  return null;
}

/**
 * Inbox query (F5).
 *
 * Thin composition over the notification entity: the infinite list plus
 * mark-all-read, plus tap-target prefetch (post or actor warmed through
 * their own entity caches). No `setQueryData` here — only entity helpers
 * run inside the entity hooks below.
 */

import { useQueryClient } from "@tanstack/react-query";

import {
  getNotificationData,
  useMarkAllNotificationsRead,
  useNotifications,
} from "@/entities/notification";
import type { UseNotificationOptions } from "@/entities/notification";
import { fetchPost } from "@/entities/post";
import { fetchUser } from "@/entities/user";
import { queryKeys } from "@/shared/query";

export type InboxFetchOptions = UseNotificationOptions;

export function useInbox(opts: InboxFetchOptions = {}) {
  const qc = useQueryClient();
  const list = useNotifications(opts);
  const markAll = useMarkAllNotificationsRead(opts);

  /** Warm the tap target (post or actor) so detail opens without loading. */
  const prefetchTarget = (id: string): void => {
    const notification = getNotificationData(qc, id);
    if (!notification) return;
    if (notification.postId) {
      const postId = notification.postId;
      void qc.prefetchQuery({
        queryKey: queryKeys.post(postId),
        queryFn: async () => {
          const post = await fetchPost(postId, opts);
          if (!post) throw new Error(`Invalid post ${postId}`);
          return post;
        },
        staleTime: 30_000,
      });
    } else {
      const actorId = notification.actorId;
      void qc.prefetchQuery({
        queryKey: queryKeys.user(actorId),
        queryFn: async () => {
          const user = await fetchUser(actorId, opts);
          if (!user) throw new Error(`Invalid user ${actorId}`);
          return user;
        },
        staleTime: 30_000,
      });
    }
  };

  return {
    ...list,
    prefetchTarget,
    markAllRead: () => markAll.mutate(),
    markAllResult: markAll.data,
    isMarkingAll: markAll.isPending,
  };
}

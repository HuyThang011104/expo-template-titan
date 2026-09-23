/**
 * Post canonical cache.
 *
 * - Only file allowed to `setQueryData(queryKeys.post…)`.
 * - `hydrateFeedItem` writes both post and author canonical entries.
 * - `likePost` is read → optimistic flip → server wins → rollback.
 */

import type { QueryClient } from "@tanstack/react-query";

import { logger } from "@/shared/observability/logger";
import { queryKeys } from "@/shared/query";

import { likePostRemote } from "./api";
import type { FeedWireItem, Post } from "./model";

/** Overwrite the canonical post. */
export function setPost(qc: QueryClient, post: Post): void {
  qc.setQueryData(queryKeys.post(post.id), post);
}

/** Read the canonical post (no fetch). */
export function getPostData(qc: QueryClient, id: string): Post | undefined {
  return qc.getQueryData<Post>(queryKeys.post(id));
}

/**
 * Merge a patch into the canonical entry; `undefined` when missing.
 */
export function patchPost(qc: QueryClient, id: string, patch: Partial<Post>): Post | undefined {
  const prev = getPostData(qc, id);
  if (!prev) return undefined;
  const next: Post = { ...prev, ...patch };
  qc.setQueryData(queryKeys.post(id), next);
  return next;
}

/**
 * Hydrate one `{ post, author }` wire item; returns `{ postId }`.
 */
export function hydrateFeedItem(qc: QueryClient, item: FeedWireItem): { postId: string } {
  setPost(qc, item.post);
  qc.setQueryData(queryKeys.user(item.author.id), item.author);
  return { postId: item.post.id };
}

export type LikeRemoteFn = typeof likePostRemote;

export type LikePostOptions = {
  likeRemote?: LikeRemoteFn;
};

/**
 * Like/unlike with cross-cache optimistic update; all callers must use this.
 */
export async function likePost(
  qc: QueryClient,
  id: string,
  opts: LikePostOptions = {},
): Promise<void> {
  const prev = getPostData(qc, id);
  // No canonical entry → skip here, do not fetch.
  if (!prev) return;

  const liked = !prev.likedByMe;
  patchPost(qc, id, {
    likedByMe: liked,
    likeCount: Math.max(0, prev.likeCount + (liked ? 1 : -1)),
  });

  const remote = opts.likeRemote ?? likePostRemote;
  try {
    const server = await remote(id, liked);
    // Server wins on a valid post; `null` means failure → rollback.
    if (server) {
      setPost(qc, server);
      return;
    }
  } catch {
    // Fall through to rollback below.
  }
  setPost(qc, prev);
  logger.warn("[post] like failed, rolled back", { postId: id });
}

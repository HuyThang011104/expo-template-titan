/**
 * Saved canonical cache (G1.4).
 *
 * - Only file allowed to `setQueryData(queryKeys.savedPosts())`. Features
 *   call these helpers, never `setQueryData` directly.
 * - `hydrateSavedItem` writes the post plus its author snapshot into their
 *   canonical entries (same discipline as `hydrateFeedItem`); the saved list
 *   holds ids only, so `PostCard` renders saved rows with zero extra fetch.
 * - `setSaved` flips one id optimistically and rolls the pages back on
 *   failure (throwing so buttons show inline error + retry, like follow).
 */

import type { InfiniteData, QueryClient } from "@tanstack/react-query";

import { logger } from "@/shared/observability/logger";
import { queryKeys } from "@/shared/query";

import { savePostRemote, unsavePostRemote } from "./api";
import type { SavedPostWireItem } from "./model";

export type SavedPostsPageShape = {
  postIds: string[];
  nextCursor: string | null;
};

/** Hydrate one `{ post, author }` wire item; returns `{ postId }`. */
export function hydrateSavedItem(
  qc: QueryClient,
  item: SavedPostWireItem,
): { postId: string } {
  qc.setQueryData(queryKeys.post(item.post.id), item.post);
  qc.setQueryData(queryKeys.user(item.author.id), item.author);
  return { postId: item.post.id };
}

/** Read loaded saved ids across pages (no fetch). */
export function getSavedIds(qc: QueryClient): string[] {
  const data = qc.getQueryData<InfiniteData<SavedPostsPageShape, string | null>>(
    queryKeys.savedPosts(),
  );
  if (!data) return [];
  return data.pages.flatMap((page) => page.postIds);
}

/** Whether `postId` is in the loaded saved pages (no fetch). */
export function isSaved(qc: QueryClient, postId: string): boolean {
  return getSavedIds(qc).includes(postId);
}

export type SetSavedRemoteFn = typeof savePostRemote | typeof unsavePostRemote;

export type SetSavedOptions = {
  saveRemote?: typeof savePostRemote;
  unsaveRemote?: typeof unsavePostRemote;
};

function insertSavedId(
  qc: QueryClient,
  key: readonly unknown[],
  postId: string,
): void {
  qc.setQueryData<InfiniteData<SavedPostsPageShape, string | null>>(key, (old) => {
    if (!old) {
      return { pages: [{ postIds: [postId], nextCursor: null }], pageParams: [null] };
    }
    const [first, ...rest] = old.pages;
    if (!first) return old;
    if (first.postIds.includes(postId)) return old;
    return {
      ...old,
      pages: [{ ...first, postIds: [postId, ...first.postIds] }, ...rest],
    };
  });
}

function stripSavedId(
  qc: QueryClient,
  key: readonly unknown[],
  postId: string,
): void {
  qc.setQueryData<InfiniteData<SavedPostsPageShape, string | null>>(key, (old) => {
    if (!old) return old;
    let touched = false;
    const pages = old.pages.map((page) => {
      if (!page.postIds.includes(postId)) return page;
      touched = true;
      return { ...page, postIds: page.postIds.filter((id) => id !== postId) };
    });
    return touched ? { ...old, pages } : old;
  });
}

/**
 * Save/unsave one post with optimistic update; all callers must use this.
 * Throws on failure (after rollback) so buttons show inline error + retry.
 */
export async function setSaved(
  qc: QueryClient,
  postId: string,
  saved: boolean,
  opts: SetSavedOptions = {},
): Promise<void> {
  const key = queryKeys.savedPosts();
  const prev = qc.getQueryData<InfiniteData<SavedPostsPageShape, string | null>>(key);
  if (saved) insertSavedId(qc, key, postId);
  else stripSavedId(qc, key, postId);

  const remote = saved ? (opts.saveRemote ?? savePostRemote) : (opts.unsaveRemote ?? unsavePostRemote);
  let ok = false;
  try {
    ok = await remote(postId);
  } catch {
    ok = false;
  }
  if (ok) return;
  qc.setQueryData(key, prev);
  logger.warn("[saved] toggle failed, rolled back", { postId, saved });
  throw new Error(`[saved] ${saved ? "Save" : "Unsave"} failed for ${postId}`);
}

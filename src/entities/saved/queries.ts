/**
 * Saved queries (G1.4).
 *
 * - `useSavedPosts` is the infinite saved list; pages hold ids only.
 * - `useIsSaved` derives one id's state from the same list (single fetch,
 *   shared across every save button).
 * - `useSetSaved` wraps `setSaved` with no extra handlers or retry.
 */

import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { logger } from "@/shared/observability/logger";
import { queryKeys } from "@/shared/query";

import { fetchSavedPostsRemote, savePostRemote, unsavePostRemote } from "./api";
import { hydrateSavedItem, setSaved } from "./cache";

export type QueryFetchOptions = {
  fetchImpl?: typeof fetch;
};

export type SavedPostsPage = {
  postIds: string[];
  nextCursor: string | null;
};

export function useSavedPosts(opts: QueryFetchOptions = {}) {
  const qc = useQueryClient();
  const infinite = useInfiniteQuery({
    queryKey: queryKeys.savedPosts(),
    queryFn: async ({ pageParam }): Promise<SavedPostsPage> => {
      const page = await fetchSavedPostsRemote(pageParam, opts);
      if (!page) {
        logger.warn("[saved] invalid page");
        throw new Error("[saved] Invalid saved page");
      }
      const postIds: string[] = [];
      for (const item of page.items) {
        postIds.push(hydrateSavedItem(qc, item).postId);
      }
      return { postIds, nextCursor: page.nextCursor };
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage: SavedPostsPage) => lastPage.nextCursor ?? undefined,
  });

  const postIds = (infinite.data?.pages ?? []).flatMap((page) => page.postIds);
  return { ...infinite, postIds };
}

/** Whether `postId` is saved (reads the shared saved list, no extra fetch). */
export function useIsSaved(postId: string, opts: QueryFetchOptions = {}): boolean {
  const { postIds } = useSavedPosts(opts);
  return postIds.includes(postId);
}

/** Save/unsave mutation (optimistic in cache, throws for inline retry). */
export function useSetSaved(postId: string, opts: QueryFetchOptions = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (saved: boolean) =>
      setSaved(qc, postId, saved, {
        saveRemote: (id) => savePostRemote(id, opts),
        unsaveRemote: (id) => unsavePostRemote(id, opts),
      }),
  });
}

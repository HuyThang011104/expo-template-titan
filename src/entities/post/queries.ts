/**
 * Post queries.
 *
 * - `usePost` mirrors `useUser` with `queryKeys.post(id)`.
 * - `useLikePost` wraps `likePost` with no extra handlers or retry.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/shared/query";

import { fetchPost, likePostRemote } from "./api";
import { likePost } from "./cache";
import type { FeedWireItem } from "./model";

export type QueryFetchOptions = {
  fetchImpl?: typeof fetch;
};

export function usePost(id: string, opts: QueryFetchOptions = {}) {
  return useQuery({
    queryKey: queryKeys.post(id),
    queryFn: async () => {
      const post = await fetchPost(id, opts);
      if (!post) throw new Error(`Invalid post ${id}`);
      return post;
    },
    staleTime: 30_000,
    enabled: id.length > 0,
  });
}

export function useLikePost(id: string, opts: QueryFetchOptions = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      likePost(qc, id, {
        likeRemote: (postId, liked) => likePostRemote(postId, liked, opts),
      }),
  });
}

export type PostAuthor = FeedWireItem["author"];

/**
 * Read the author from the canonical cache seeded by `hydrateFeedItem`.
 * Uses the shared canonical key; a missing entry is an `error` fallback.
 */
export function usePostAuthor(authorId: string) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: queryKeys.user(authorId),
    queryFn: async (): Promise<PostAuthor> => {
      const cached = qc.getQueryData<PostAuthor>(queryKeys.user(authorId));
      if (cached) return cached;
      throw new Error(`Unknown user ${authorId}`);
    },
    staleTime: 30_000,
    enabled: authorId.length > 0,
  });
}

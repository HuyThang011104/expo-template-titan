/**
 * Post queries.
 *
 * - `usePost` mirrors `useUser` with `queryKeys.post(id)`.
 * - `useLikePost` wraps `likePost` with no extra handlers or retry.
 * - `useCreatePost` posts once (no auto-retry: double-send risk) and
 *   prepends via `addCreatedPost` on success.
 */

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { logger } from "@/shared/observability/logger";
import { queryKeys } from "@/shared/query";

import { createPostRemote, fetchPost, fetchUserPostsRemote, likePostRemote } from "./api";
import { addCreatedPost, hydrateFeedItem, likePost } from "./cache";
import type { CreatePostInput } from "./schema";
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

export function useCreatePost(opts: QueryFetchOptions = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreatePostInput) => {
      const post = await createPostRemote(input.body, input.mediaIds, opts);
      if (!post) throw new Error("[post] Invalid create-post response");
      return post;
    },
    onSuccess: (post) => {
      addCreatedPost(qc, post);
    },
  });
}

export type UserPostsPage = {
  postIds: string[];
  nextCursor: string | null;
};

export function useUserPosts(userId: string, opts: QueryFetchOptions = {}) {
  const qc = useQueryClient();
  const infinite = useInfiniteQuery({
    queryKey: queryKeys.userPosts(userId),
    queryFn: async ({ pageParam }): Promise<UserPostsPage> => {
      const page = await fetchUserPostsRemote(userId, pageParam, opts);
      if (!page) {
        logger.warn("[post] invalid user-posts page", { userId });
        throw new Error(`[post] Invalid user-posts page for ${userId}`);
      }
      const postIds: string[] = [];
      for (const item of page.items) {
        postIds.push(hydrateFeedItem(qc, item).postId);
      }
      return { postIds, nextCursor: page.nextCursor };
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage: UserPostsPage) => lastPage.nextCursor ?? undefined,
    enabled: userId.length > 0,
  });

  const postIds = (infinite.data?.pages ?? []).flatMap((page) => page.postIds);

  /** Warm the canonical post so detail opens without loading. */
  const prefetchPost = (id: string): void => {
    void qc.prefetchQuery({
      queryKey: queryKeys.post(id),
      queryFn: async () => {
        const post = await fetchPost(id, opts);
        if (!post) throw new Error(`Invalid post ${id}`);
        return post;
      },
      staleTime: 30_000,
    });
  };

  return { ...infinite, postIds, prefetchPost };
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

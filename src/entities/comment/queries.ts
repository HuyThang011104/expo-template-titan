/**
 * Comment queries (G1.2).
 *
 * - `useComment` mirrors `usePost` with `queryKeys.comment(id)`.
 * - `usePostComments` is the infinite per-post list; pages hold ids only.
 * - `useCreateComment` posts once (no auto-retry: double-post risk) and
 *   inserts via `addComment` on success.
 * - `useLikeComment` wraps `likeComment` with no extra handlers or retry.
 */

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { logger } from "@/shared/observability/logger";
import { queryKeys } from "@/shared/query";

import {
  createCommentRemote,
  fetchPostCommentsRemote,
  likeCommentRemote,
} from "./api";
import { createComment, hydrateCommentItem, likeComment } from "./cache";
import type { Comment } from "./model";

export type QueryFetchOptions = {
  fetchImpl?: typeof fetch;
};

export type PostCommentsPage = {
  commentIds: string[];
  nextCursor: string | null;
};

export function useComment(id: string) {
  const qc = useQueryClient();
  return useQuery({
    // Canonical read with an `error` fallback when the id was never hydrated.
    queryKey: queryKeys.comment(id),
    queryFn: async (): Promise<Comment> => {
      const cached = qc.getQueryData<Comment>(queryKeys.comment(id));
      if (cached) return cached;
      throw new Error(`Unknown comment ${id}`);
    },
    staleTime: 30_000,
    enabled: id.length > 0,
  });
}

export function usePostComments(postId: string, opts: QueryFetchOptions = {}) {
  const qc = useQueryClient();
  const infinite = useInfiniteQuery({
    queryKey: queryKeys.postComments(postId),
    queryFn: async ({ pageParam }): Promise<PostCommentsPage> => {
      const page = await fetchPostCommentsRemote(postId, pageParam, opts);
      if (!page) {
        logger.warn("[comment] invalid page", { postId });
        throw new Error(`[comment] Invalid comments page for ${postId}`);
      }
      const commentIds: string[] = [];
      for (const item of page.items) {
        commentIds.push(hydrateCommentItem(qc, item).commentId);
      }
      return { commentIds, nextCursor: page.nextCursor };
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage: PostCommentsPage) => lastPage.nextCursor ?? undefined,
    enabled: postId.length > 0,
  });

  const commentIds = (infinite.data?.pages ?? []).flatMap((page) => page.commentIds);
  return { ...infinite, commentIds };
}

export type CreateCommentArgs = {
  body: string;
  parentId: string | null;
};

export function useCreateComment(postId: string, opts: QueryFetchOptions = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ body, parentId }: CreateCommentArgs) =>
      createComment(qc, postId, body, parentId, {
        createRemote: (targetPostId, text, replyTo) =>
          createCommentRemote(targetPostId, text, replyTo, opts),
      }),
  });
}

export function useLikeComment(id: string, opts: QueryFetchOptions = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      likeComment(qc, id, {
        likeRemote: (commentId, liked) => likeCommentRemote(commentId, liked, opts),
      }),
  });
}

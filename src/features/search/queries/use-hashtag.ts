/**
 * Hashtag query (G1.5 posts + G2.2 header count).
 *
 * - Single `GET /hashtag/:tag?cursor=` returning paginated post wire items
 *   plus `tag`/`postCount` for the G2.2 header (`#tag` + đếm bài).
 * - Hydrates through entity caches only; never `setQueryData` here.
 * - Unknown tags are 200-empty (never a crash); weird tags normalize first.
 */

import { useInfiniteQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";

import { fetchPost, hydrateFeedItem } from "@/entities/post";
import { client } from "@/shared/api";
import { endpoints } from "@/shared/api/endpoints";
import { logger } from "@/shared/observability/logger";
import { queryKeys } from "@/shared/query";

import { normalizeHashtag, parseHashtagPage } from "../schema";

export type HashtagFetchOptions = {
  fetchImpl?: typeof fetch;
};

export type HashtagPage = {
  postIds: string[];
  nextCursor: string | null;
  tag: string | null;
  postCount: number | null;
};

export { normalizeHashtag };

export async function fetchHashtagPage(
  qc: QueryClient,
  tag: string,
  cursor: string | null,
  opts: HashtagFetchOptions = {},
): Promise<HashtagPage> {
  const normalized = normalizeHashtag(tag);
  const data: unknown = await client.get<unknown>(endpoints.hashtag(normalized, cursor), {
    fetchImpl: opts.fetchImpl,
  });
  const parsed = parseHashtagPage(data);
  if (!parsed) {
    logger.warn("[search] invalid hashtag page shape", { tag: normalized });
    throw new Error("[search] Invalid hashtag page");
  }
  const postIds: string[] = [];
  for (const item of parsed.items) {
    postIds.push(hydrateFeedItem(qc, item).postId);
  }
  return {
    postIds,
    nextCursor: parsed.nextCursor,
    tag: parsed.tag ?? normalized,
    postCount: parsed.postCount,
  };
}

export function useHashtag(tag: string, opts: HashtagFetchOptions = {}) {
  const qc = useQueryClient();
  const normalized = normalizeHashtag(tag);

  const infinite = useInfiniteQuery({
    queryKey: queryKeys.hashtag(normalized),
    queryFn: ({ pageParam }) => fetchHashtagPage(qc, normalized, pageParam, opts),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage: HashtagPage) => lastPage.nextCursor ?? undefined,
    enabled: normalized.length > 0,
    staleTime: 30_000,
  });

  const postIds = (infinite.data?.pages ?? []).flatMap((page) => page.postIds);
  // Header count: prefer the server total, fall back to loaded ids.
  const postCount =
    infinite.data?.pages[0]?.postCount ?? (infinite.isSuccess ? postIds.length : null);

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

  return { ...infinite, postIds, postCount, normalizedTag: normalized, prefetchPost };
}

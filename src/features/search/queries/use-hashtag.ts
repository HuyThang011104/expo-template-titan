/**
 * Hashtag query (G1.5).
 *
 * - Single `GET /hashtag/:tag?cursor=` returning paginated post wire items
 *   (no users — the tag page is posts-only in G1; the pretty page is G2).
 * - Hydrates through entity caches only; never `setQueryData` here.
 */

import { useInfiniteQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";

import { fetchPost, hydrateFeedItem, parseFeedWireItem } from "@/entities/post";
import { client } from "@/shared/api";
import { endpoints } from "@/shared/api/endpoints";
import { logger } from "@/shared/observability/logger";
import { queryKeys } from "@/shared/query";

export type HashtagFetchOptions = {
  fetchImpl?: typeof fetch;
};

export type HashtagPage = {
  postIds: string[];
  nextCursor: string | null;
};

export function normalizeHashtag(tag: string): string {
  return tag.trim().toLowerCase().replace(/^#+/, "");
}

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
  if (
    data === null ||
    typeof data !== "object" ||
    !("items" in data) ||
    !Array.isArray((data as { items: unknown }).items)
  ) {
    logger.warn("[search] invalid hashtag page shape", { tag: normalized });
    throw new Error("[search] Invalid hashtag page");
  }
  const raw = data as { items: unknown[]; nextCursor?: unknown };
  const postIds: string[] = [];
  for (const item of raw.items) {
    const parsed = parseFeedWireItem(item);
    if (!parsed) continue;
    postIds.push(hydrateFeedItem(qc, parsed).postId);
  }
  return {
    postIds,
    nextCursor: typeof raw.nextCursor === "string" ? raw.nextCursor : null,
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

/**
 * Home feed infinite query.
 *
 * - `queryFn` fetches `GET /feed/home`, skips invalid items,
 *   hydrates the canonical cache, and returns `{ postIds, nextCursor }`.
 * - Reads and likes go through the canonical entity cache.
 */

import { useInfiniteQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";

import { fetchPost, hydrateFeedItem, parseFeedWireItem } from "@/entities/post";
import { client } from "@/shared/api";
import { logger } from "@/shared/observability/logger";
import { queryKeys } from "@/shared/query";

export type HomeFeedPage = {
  postIds: string[];
  nextCursor: string | null;
};

export type FeedFetchOptions = {
  fetchImpl?: typeof fetch;
};

export async function fetchHomeFeedPage(
  qc: QueryClient,
  cursor: string | null,
  opts: FeedFetchOptions = {},
): Promise<HomeFeedPage> {
  const path = cursor ? `/feed/home?cursor=${encodeURIComponent(cursor)}` : "/feed/home";
  const data: unknown = await client.get<unknown>(path, { fetchImpl: opts.fetchImpl });

  if (
    data === null ||
    typeof data !== "object" ||
    !("items" in data) ||
    !Array.isArray((data as { items: unknown }).items)
  ) {
    logger.warn("[feed] invalid page shape", { cursor });
    throw new Error("[feed] Invalid home feed page");
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

export function useHomeFeed(opts: FeedFetchOptions = {}) {
  const qc = useQueryClient();
  const infinite = useInfiniteQuery({
    queryKey: queryKeys.homeFeed(),
    queryFn: ({ pageParam }) => fetchHomeFeedPage(qc, pageParam, opts),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage: HomeFeedPage) => lastPage.nextCursor ?? undefined,
  });

  const postIds = (infinite.data?.pages ?? []).flatMap((page) => page.postIds);

  /** Warm the canonical post on touch so detail opens without loading. */
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

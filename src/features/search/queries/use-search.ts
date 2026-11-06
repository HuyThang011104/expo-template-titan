/**
 * Search query (F3).
 *
 * - Single `GET /search?q=&cursor=` returning top users + paginated posts.
 * - Hydrates through entity caches only; never `setQueryData` here.
 * - `enabled` gates on `SEARCH_MIN_LENGTH` so short queries do not fetch.
 */

import { useInfiniteQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";

import { fetchPost, hydrateFeedItem } from "@/entities/post";
import { hydrateUser } from "@/entities/user";
import { client } from "@/shared/api";
import { endpoints } from "@/shared/api/endpoints";
import { logger } from "@/shared/observability/logger";
import { queryKeys } from "@/shared/query";

import { SEARCH_MIN_LENGTH, parseSearchPage } from "../schema";

export type SearchFetchOptions = {
  fetchImpl?: typeof fetch;
};

export type SearchPage = {
  userIds: string[];
  postIds: string[];
  nextCursor: string | null;
};

export async function fetchSearchPage(
  qc: QueryClient,
  query: string,
  cursor: string | null,
  opts: SearchFetchOptions = {},
): Promise<SearchPage> {
  const normalized = query.trim().toLowerCase();
  const data: unknown = await client.get<unknown>(endpoints.search(normalized, cursor), {
    fetchImpl: opts.fetchImpl,
  });
  const parsed = parseSearchPage(data);
  if (!parsed) {
    logger.warn("[search] invalid page shape", { query: normalized });
    throw new Error("[search] Invalid search page");
  }
  const userIds: string[] = [];
  for (const user of parsed.users) {
    hydrateUser(qc, user);
    userIds.push(user.id);
  }
  const postIds: string[] = [];
  for (const item of parsed.items) {
    postIds.push(hydrateFeedItem(qc, item).postId);
  }
  return { userIds, postIds, nextCursor: parsed.nextCursor };
}

export function normalizeSearchQuery(query: string): string {
  return query.trim().toLowerCase();
}

export function useSearch(query: string, opts: SearchFetchOptions = {}) {
  const qc = useQueryClient();
  const normalized = normalizeSearchQuery(query);
  const enabled = normalized.length >= SEARCH_MIN_LENGTH;

  const infinite = useInfiniteQuery({
    queryKey: queryKeys.search(normalized),
    queryFn: ({ pageParam }) => fetchSearchPage(qc, normalized, pageParam, opts),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage: SearchPage) => lastPage.nextCursor ?? undefined,
    enabled,
    staleTime: 30_000,
  });

  // Users are top matches from page 0 (not paginated); posts flatten all pages.
  const userIds = infinite.data?.pages[0]?.userIds ?? [];
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

  return { ...infinite, userIds, postIds, prefetchPost, enabled };
}

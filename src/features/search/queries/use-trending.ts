/**
 * Trending query (G2.2).
 *
 * - Single `GET /trending` returning hot tags + suggested users.
 * - Hydrates users through the entity cache only; tags are header data
 *   (no canonical tag entity — the tag page revalidates via `useHashtag`).
 * - Never `setQueryData` here except via `hydrateUser`.
 */

import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";

import { hydrateUser } from "@/entities/user";
import { client } from "@/shared/api";
import { endpoints } from "@/shared/api/endpoints";
import { logger } from "@/shared/observability/logger";
import { queryKeys } from "@/shared/query";

import { parseTrendingPage, type HashtagInfo } from "../schema";

export type TrendingFetchOptions = {
  fetchImpl?: typeof fetch;
};

export type TrendingData = {
  tags: HashtagInfo[];
  userIds: string[];
};

export async function fetchTrending(
  qc: QueryClient,
  opts: TrendingFetchOptions = {},
): Promise<TrendingData> {
  const data: unknown = await client.get<unknown>(endpoints.trending(), {
    fetchImpl: opts.fetchImpl,
  });
  const parsed = parseTrendingPage(data);
  if (!parsed) {
    logger.warn("[search] invalid trending shape");
    throw new Error("[search] Invalid trending page");
  }
  const userIds: string[] = [];
  for (const user of parsed.users) {
    hydrateUser(qc, user);
    userIds.push(user.id);
  }
  return { tags: parsed.tags, userIds };
}

export function useTrending(opts: TrendingFetchOptions = {}) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: queryKeys.trending(),
    queryFn: () => fetchTrending(qc, opts),
    staleTime: 60_000,
  });
  return {
    ...query,
    tags: query.data?.tags ?? [],
    userIds: query.data?.userIds ?? [],
  };
}

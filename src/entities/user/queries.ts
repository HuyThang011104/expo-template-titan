/**
 * User queries.
 *
 * Thin hook over `queryKeys.user(id)`. Parse failure throws
 * so React Query surfaces an `error` state for UI fallback.
 */

import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/shared/query";

import { fetchUser } from "./api";

export type QueryFetchOptions = {
  fetchImpl?: typeof fetch;
};

export function useUser(id: string, opts: QueryFetchOptions = {}) {
  return useQuery({
    queryKey: queryKeys.user(id),
    queryFn: async () => {
      const user = await fetchUser(id, opts);
      if (!user) throw new Error(`Invalid user ${id}`);
      return user;
    },
    staleTime: 30_000,
    enabled: id.length > 0,
  });
}

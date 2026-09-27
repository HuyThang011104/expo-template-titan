/**
 * User queries.
 *
 * Thin hook over `queryKeys.user(id)`. Parse failure throws
 * so React Query surfaces an `error` state for UI fallback.
 */

import { useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/shared/query";

import { fetchMe, fetchUser, fetchUserByHandle } from "./api";
import { setUser, setUserByHandle } from "./cache";

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

export function useMe(opts: QueryFetchOptions = {}) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: async () => {
      const user = await fetchMe(opts);
      if (!user) throw new Error("[user] Invalid me response");
      setUser(qc, user);
      return user;
    },
    staleTime: 30_000,
  });
}

export function useUserByHandle(handle: string, opts: QueryFetchOptions = {}) {
  const qc = useQueryClient();
  const normalized = handle.trim().toLowerCase();
  return useQuery({
    queryKey: queryKeys.userByHandle(normalized),
    queryFn: async () => {
      const user = await fetchUserByHandle(handle, opts);
      if (!user) throw new Error(`Unknown user @${handle}`);
      setUserByHandle(qc, normalized, user);
      return user;
    },
    staleTime: 30_000,
    enabled: normalized.length > 0,
  });
}

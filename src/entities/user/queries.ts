/**
 * User queries.
 *
 * Thin hook over `queryKeys.user(id)`. Parse failure throws
 * so React Query surfaces an `error` state for UI fallback.
 */

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/shared/query";

import { fetchMe, fetchUser, fetchUserByHandle } from "./api";
import {
  approveFollowRequestRemote,
  fetchRelationship,
  followUserRemote,
  rejectFollowRequestRemote,
  unfollowUserRemote,
} from "./api-relationship";
import { fetchFollowersRemote, fetchFollowingRemote, fetchFollowRequestsRemote, type FollowListPage } from "./api-follow";
import { setUser, setUserByHandle } from "./cache";
import {
  approveFollowRequest,
  followUser,
  rejectFollowRequest,
  setRelationship,
  unfollowUser,
} from "./relationship-cache";

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

/* ------------------------------------------------------------------ */
/* G1.1 follow queries (relationship + id-lists, canonical cache).     */
/* ------------------------------------------------------------------ */

/** Canonical relationship for one user; seeds `relationship-cache`. */
export function useRelationship(userId: string, opts: QueryFetchOptions = {}) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: queryKeys.userRelationship(userId),
    queryFn: async () => {
      const rel = await fetchRelationship(userId, opts);
      if (!rel) throw new Error(`Invalid relationship ${userId}`);
      setRelationship(qc, rel);
      return rel;
    },
    staleTime: 30_000,
    enabled: userId.length > 0,
  });
}

export type FollowListPageShape = {
  userIds: string[];
  nextCursor: string | null;
};

function useFollowList(
  key: readonly unknown[],
  userId: string,
  fetchPage: (cursor: string | null) => Promise<FollowListPage | null>,
) {
  const qc = useQueryClient();
  const infinite = useInfiniteQuery({
    queryKey: key,
    queryFn: async ({ pageParam }) => {
      const page = await fetchPage(pageParam);
      if (!page) throw new Error("[user] Invalid follow list page");
      const userIds: string[] = [];
      for (const user of page.users) {
        setUser(qc, user);
        userIds.push(user.id);
      }
      return { userIds, nextCursor: page.nextCursor } satisfies FollowListPageShape;
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage: FollowListPageShape) => lastPage.nextCursor ?? undefined,
    enabled: userId.length > 0,
  });
  const userIds = (infinite.data?.pages ?? []).flatMap((page) => page.userIds);
  return { ...infinite, userIds };
}

/** Users following `userId` (ids only; rows read canonical `useUser`). */
export function useFollowers(userId: string, opts: QueryFetchOptions = {}) {
  return useFollowList(queryKeys.userFollowers(userId), userId, (cursor) =>
    fetchFollowersRemote(userId, cursor, opts),
  );
}

/** Users `userId` follows. */
export function useFollowing(userId: string, opts: QueryFetchOptions = {}) {
  return useFollowList(queryKeys.userFollowing(userId), userId, (cursor) =>
    fetchFollowingRemote(userId, cursor, opts),
  );
}

/** Incoming follow requests to me. */
export function useFollowRequests(opts: QueryFetchOptions = {}) {
  const qc = useQueryClient();
  const infinite = useInfiniteQuery({
    queryKey: queryKeys.followRequests(),
    queryFn: async ({ pageParam }) => {
      const page = await fetchFollowRequestsRemote(pageParam, opts);
      if (!page) throw new Error("[user] Invalid follow-requests page");
      const userIds: string[] = [];
      for (const user of page.users) {
        setUser(qc, user);
        userIds.push(user.id);
      }
      return { userIds, nextCursor: page.nextCursor } satisfies FollowListPageShape;
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage: FollowListPageShape) => lastPage.nextCursor ?? undefined,
  });
  const userIds = (infinite.data?.pages ?? []).flatMap((page) => page.userIds);
  return { ...infinite, userIds };
}

/** Follow mutation (optimistic in cache, no auto-retry — callers roll back). */
export function useFollowUser(userId: string, opts: QueryFetchOptions = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      followUser(qc, userId, {
        remote: (id) => followUserRemote(id, opts),
      }),
  });
}

/** Unfollow mutation (also cancels a pending request). */
export function useUnfollowUser(userId: string, opts: QueryFetchOptions = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      unfollowUser(qc, userId, {
        remote: (id) => unfollowUserRemote(id, opts),
      }),
  });
}

/** Approve an incoming request; refreshes relationship counts after. */
export function useApproveFollowRequest(followerId: string, opts: QueryFetchOptions = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      approveFollowRequest(qc, followerId, {
        remote: (id) => approveFollowRequestRemote(id, opts),
      }),
  });
}

/** Reject an incoming request. */
export function useRejectFollowRequest(followerId: string, opts: QueryFetchOptions = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      rejectFollowRequest(qc, followerId, {
        remote: (id) => rejectFollowRequestRemote(id, opts),
      }),
  });
}

/**
 * Relationship canonical cache (F6).
 *
 * - Only place allowed to `setQueryData(queryKeys.userRelationship…)`.
 *   `cache.ts` (users) is untouched.
 * - Safety actions are read → optimistic flip → server wins → rollback,
 *   then `invalidateVisibleLists` so blocked/muted authors disappear from
 *   every list. Scroll loss is accepted (rare event, documented in F6 plan).
 */

import type { QueryClient } from "@tanstack/react-query";

import { logger } from "@/shared/observability/logger";
import { queryKeys } from "@/shared/query";

import {
  approveFollowRequestRemote,
  blockUserRemote,
  followUserRemote,
  muteUserRemote,
  rejectFollowRequestRemote,
  unblockUserRemote,
  unfollowUserRemote,
  unmuteUserRemote,
} from "./api-relationship";
import type { FollowStatus, Relationship } from "./relationship";

export function defaultRelationship(userId: string): Relationship {
  return {
    userId,
    blockedByMe: false,
    mutedByMe: false,
    followStatus: "none",
    followersCount: 0,
    followingCount: 0,
    isPrivate: false,
    blockedByTarget: false,
    updatedAt: new Date(0).toISOString(),
  };
}

/** Overwrite the canonical relationship. */
export function setRelationship(qc: QueryClient, rel: Relationship): void {
  qc.setQueryData(queryKeys.userRelationship(rel.userId), rel);
}

/** Read the canonical relationship, defaulting to unblocked/unmuted (no fetch). */
export function getRelationship(qc: QueryClient, userId: string): Relationship {
  return (
    qc.getQueryData<Relationship>(queryKeys.userRelationship(userId)) ??
    defaultRelationship(userId)
  );
}

export function isBlockedByMe(qc: QueryClient, userId: string): boolean {
  return getRelationship(qc, userId).blockedByMe;
}

export function isMutedByMe(qc: QueryClient, userId: string): boolean {
  return getRelationship(qc, userId).mutedByMe;
}

/**
 * Invalidate visible id-lists once so safety actions take effect everywhere.
 * `["users"]` is NOT used as a prefix (it would drop canonical users);
 * user-post lists match by predicate instead.
 */
export function invalidateVisibleLists(qc: QueryClient): void {
  void qc.invalidateQueries({ queryKey: ["feed"] });
  void qc.invalidateQueries({ queryKey: ["search"] });
  void qc.invalidateQueries({
    predicate: (query) => {
      const key = query.queryKey;
      return (
        Array.isArray(key) && key.length === 3 && key[0] === "users" && key[2] === "posts"
      );
    },
  });
}

export type SafetyRemoteFn =
  | typeof blockUserRemote
  | typeof unblockUserRemote
  | typeof muteUserRemote
  | typeof unmuteUserRemote;

export type SafetyActionOptions = {
  remote?: SafetyRemoteFn;
};

async function runSafetyAction(
  qc: QueryClient,
  userId: string,
  action: "block" | "unblock" | "mute" | "unmute",
  opts: SafetyActionOptions,
): Promise<void> {
  const prev = getRelationship(qc, userId);
  const patch: Partial<Relationship> =
    action === "block"
      ? { blockedByMe: true }
      : action === "unblock"
        ? { blockedByMe: false }
        : action === "mute"
          ? { mutedByMe: true }
          : { mutedByMe: false };
  setRelationship(qc, {
    ...prev,
    ...patch,
    updatedAt: new Date().toISOString(),
  });

  const fallback =
    action === "block"
      ? blockUserRemote
      : action === "unblock"
        ? unblockUserRemote
        : action === "mute"
          ? muteUserRemote
          : unmuteUserRemote;
  const remote = opts.remote ?? fallback;
  try {
    const server = await remote(userId);
    // Server wins on a valid relationship; `null` means failure → rollback.
    if (server) {
      setRelationship(qc, server);
      invalidateVisibleLists(qc);
      return;
    }
  } catch {
    // Fall through to rollback below.
  }
  setRelationship(qc, prev);
  logger.warn("[user] safety action failed, rolled back", { userId, action });
}

/** Block with optimistic update; all callers must use this. */
export function blockUser(
  qc: QueryClient,
  userId: string,
  opts: SafetyActionOptions = {},
): Promise<void> {
  return runSafetyAction(qc, userId, "block", opts);
}

/** Unblock with optimistic update; all callers must use this. */
export function unblockUser(
  qc: QueryClient,
  userId: string,
  opts: SafetyActionOptions = {},
): Promise<void> {
  return runSafetyAction(qc, userId, "unblock", opts);
}

/** Mute with optimistic update; all callers must use this. */
export function muteUser(
  qc: QueryClient,
  userId: string,
  opts: SafetyActionOptions = {},
): Promise<void> {
  return runSafetyAction(qc, userId, "mute", opts);
}

/** Unmute with optimistic update; all callers must use this. */
export function unmuteUser(
  qc: QueryClient,
  userId: string,
  opts: SafetyActionOptions = {},
): Promise<void> {
  return runSafetyAction(qc, userId, "unmute", opts);
}

/* ------------------------------------------------------------------ */
/* G1.1 follow / unfollow / requests (same optimistic discipline).     */
/* ------------------------------------------------------------------ */

export type FollowRemoteFn = typeof followUserRemote | typeof unfollowUserRemote;

export type FollowActionOptions = {
  remote?: FollowRemoteFn;
};

export type FollowRequestRemoteFn =
  | typeof approveFollowRequestRemote
  | typeof rejectFollowRequestRemote;

export type FollowRequestOptions = {
  remote?: FollowRequestRemoteFn;
};

/** Read the canonical follow status, defaulting to `"none"` (no fetch). */
export function getFollowStatus(qc: QueryClient, userId: string): FollowStatus {
  return getRelationship(qc, userId).followStatus;
}

function withCountDelta(rel: Relationship, delta: number): Relationship {
  return {
    ...rel,
    followersCount: Math.max(0, rel.followersCount + delta),
    updatedAt: new Date().toISOString(),
  };
}

async function runFollowAction(
  qc: QueryClient,
  userId: string,
  action: "follow" | "unfollow",
  opts: FollowActionOptions,
): Promise<void> {
  const prev = getRelationship(qc, userId);
  const optimistic: Relationship =
    action === "follow"
      ? {
          ...withCountDelta(prev, prev.followStatus === "following" ? 0 : 1),
          // Guess from the cached privacy flag; the server wins below.
          followStatus: prev.isPrivate ? "requested" : "following",
        }
      : {
          ...withCountDelta(prev, prev.followStatus === "none" ? 0 : -1),
          followStatus: "none",
        };
  setRelationship(qc, optimistic);

  const fallback = action === "follow" ? followUserRemote : unfollowUserRemote;
  const remote = opts.remote ?? fallback;
  try {
    const server = await remote(userId);
    // Server wins on a valid relationship; `null`/throw means failure → rollback.
    if (server) {
      setRelationship(qc, server);
      return;
    }
  } catch {
    // Fall through to rollback below.
  }
  setRelationship(qc, prev);
  logger.warn("[user] follow action failed, rolled back", { userId, action });
  // Throw so mutations surface an inline error + retry (G1.1). Unlike F6
  // safety actions (which resolve), a silent follow button hides failures.
  throw new Error(`[user] ${action} failed for ${userId}`);
}

/** Follow with optimistic update; all callers must use this. */
export function followUser(
  qc: QueryClient,
  userId: string,
  opts: FollowActionOptions = {},
): Promise<void> {
  return runFollowAction(qc, userId, "follow", opts);
}

/** Unfollow (also cancels a pending request) with optimistic update. */
export function unfollowUser(
  qc: QueryClient,
  userId: string,
  opts: FollowActionOptions = {},
): Promise<void> {
  return runFollowAction(qc, userId, "unfollow", opts);
}

/**
 * Approve an incoming follow request (`followerId` requested me).
 * No optimistic patch (the follower's entry must not flip my outgoing
 * status); on success the requests/followers/relationship lists refresh.
 * Throws on failure so the mutation surfaces an inline error + retry.
 */
export async function approveFollowRequest(
  qc: QueryClient,
  followerId: string,
  opts: FollowRequestOptions = {},
): Promise<void> {
  const remote = opts.remote ?? approveFollowRequestRemote;
  let ok = false;
  try {
    ok = await remote(followerId);
  } catch {
    ok = false;
  }
  if (!ok) {
    logger.warn("[user] approve request failed", { followerId });
    throw new Error(`[user] Approve request failed for ${followerId}`);
  }
  void qc.invalidateQueries({ queryKey: ["follow-requests"] });
  void qc.invalidateQueries({ predicate: isFollowListKey });
  void qc.invalidateQueries({ predicate: isRelationshipKey });
}

/** Reject an incoming follow request (same refresh/throw contract). */
export async function rejectFollowRequest(
  qc: QueryClient,
  followerId: string,
  opts: FollowRequestOptions = {},
): Promise<void> {
  const remote = opts.remote ?? rejectFollowRequestRemote;
  let ok = false;
  try {
    ok = await remote(followerId);
  } catch {
    ok = false;
  }
  if (!ok) {
    logger.warn("[user] reject request failed", { followerId });
    throw new Error(`[user] Reject request failed for ${followerId}`);
  }
  void qc.invalidateQueries({ queryKey: ["follow-requests"] });
  void qc.invalidateQueries({ predicate: isRelationshipKey });
}

function isRelationshipKey(query: { queryKey: unknown }): boolean {
  const key = query.queryKey;
  return (
    Array.isArray(key) && key.length === 3 && key[0] === "users" && key[2] === "relationship"
  );
}

function isFollowListKey(query: { queryKey: unknown }): boolean {
  const key = query.queryKey;
  return (
    Array.isArray(key) &&
    key.length === 3 &&
    key[0] === "users" &&
    (key[2] === "followers" || key[2] === "following")
  );
}

export type ViewBlockReason = "blocked" | "private" | null;

/** Why `canViewPosts` is false; `null` means visible. */
export function getViewBlockReason(
  qc: QueryClient,
  targetId: string,
  viewerId: string,
): ViewBlockReason {
  if (targetId === viewerId) return null;
  const rel = getRelationship(qc, targetId);
  if (rel.blockedByMe || rel.blockedByTarget || rel.mutedByMe) return "blocked";
  if (rel.isPrivate && rel.followStatus !== "following") return "private";
  return null;
}

/**
 * Whether `viewerId` may see `targetId`'s posts (G1.1 gating).
 * Block/mute either direction hides; private hides until following.
 * Unknown (unfetched) relationships default to visible — callers that must
 * fail closed (profile/post detail) wait for `useRelationship` first.
 */
export function canViewPosts(qc: QueryClient, targetId: string, viewerId: string): boolean {
  return getViewBlockReason(qc, targetId, viewerId) === null;
}

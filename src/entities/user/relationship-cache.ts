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
  blockUserRemote,
  muteUserRemote,
  unblockUserRemote,
  unmuteUserRemote,
} from "./api-relationship";
import type { Relationship } from "./relationship";

export function defaultRelationship(userId: string): Relationship {
  return {
    userId,
    blockedByMe: false,
    mutedByMe: false,
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

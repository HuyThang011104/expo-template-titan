/**
 * Privacy canonical cache + enforcement helpers (G2.3).
 *
 * - `updatePrivacy` validates → PATCH `/users/me/privacy` → `setUserEverywhere`,
 *   so the new setting applies on the next fetch everywhere (no list patching).
 * - `isHiddenBySafety` / `canMessageTarget` / `canTagUser` are pure cache
 *   reads (no fetch) shared by feed/search/profile/comment/inbox filters and
 *   composer gates. Unknown entries fail open except safety, which fails
 *   closed only when a relationship explicitly says blocked/muted.
 */

import type { QueryClient } from "@tanstack/react-query";

import { logger } from "@/shared/observability/logger";

import { updatePrivacyRemote, type UpdatePrivacyPayload } from "./api-privacy";
import { getUserData, setUserEverywhere } from "./cache";
import { getFollowStatus, getRelationship, invalidateVisibleLists } from "./relationship-cache";
import type { User } from "./model";
import { parseUpdatePrivacyInput } from "./schema";

export type UpdatePrivacyOptions = {
  updateRemote?: typeof updatePrivacyRemote;
};

/**
 * Edit own privacy settings: validate → PATCH → overwrite every canonical
 * user copy. Throws on invalid input or transport/HTTP errors (callers show
 * the message inline); no auto-retry.
 */
export async function updatePrivacy(
  qc: QueryClient,
  input: UpdatePrivacyPayload,
  opts: UpdatePrivacyOptions = {},
): Promise<User> {
  const parsed = parseUpdatePrivacyInput(input);
  if (!parsed) throw new Error("Cài đặt chưa hợp lệ.");
  const remote = opts.updateRemote ?? updatePrivacyRemote;
  let server: User | null = null;
  try {
    server = await remote(parsed);
  } catch {
    server = null;
  }
  if (!server) {
    logger.warn("[user] update privacy failed, kept local copy");
    throw new Error("Couldn't save your settings. Tap to retry.");
  }
  setUserEverywhere(qc, server);
  // A visibility flip (public↔followers) reshapes everyone else's lists too.
  invalidateVisibleLists(qc);
  return server;
}

/**
 * Whether `authorId`'s content must stay hidden from this viewer (G2.3).
 * Block or mute in either direction hides; unknown relationships default to
 * visible (callers that must fail closed wait for `useRelationship` first,
 * same discipline as `canViewPosts`).
 */
export function isHiddenBySafety(qc: QueryClient, authorId: string): boolean {
  const rel = getRelationship(qc, authorId);
  return rel.blockedByMe || rel.blockedByTarget || rel.mutedByMe;
}

/**
 * Whether `viewerId` may still see `authorId`'s posts: not safety-hidden and
 * passing the followers-only gate. Self always passes.
 */
export function isPostVisibleToViewer(
  qc: QueryClient,
  authorId: string,
  viewerId: string,
): boolean {
  if (authorId === viewerId) return true;
  if (isHiddenBySafety(qc, authorId)) return false;
  const rel = getRelationship(qc, authorId);
  if (rel.isPrivate && getFollowStatus(qc, authorId) !== "following") return false;
  return true;
}

/**
 * Whether `viewerId` may message `targetId` under the target's
 * `messageAudience`. `following` = the viewer follows the target
 * (checkable from the viewer's outgoing follow status).
 */
export function canMessageTarget(
  qc: QueryClient,
  targetId: string,
  viewerId: string,
): boolean {
  if (targetId === viewerId) return true;
  if (isHiddenBySafety(qc, targetId)) return false;
  const target = getUserData(qc, targetId);
  const audience = target?.privacySettings.messageAudience ?? "everyone";
  if (audience === "everyone") return true;
  if (audience === "none") return false;
  return getFollowStatus(qc, targetId) === "following";
}

/**
 * Whether `viewerId` may mention/tag `targetId` under the target's
 * `tagAudience`. Same `following` semantics as messaging. Unknown users
 * (never cached) fail open — the handle page itself handles the 404.
 */
export function canTagUser(qc: QueryClient, targetId: string, viewerId: string): boolean {
  if (targetId === viewerId) return true;
  if (isHiddenBySafety(qc, targetId)) return false;
  const target = getUserData(qc, targetId);
  if (!target) return true;
  const audience = target.privacySettings.tagAudience;
  if (audience === "everyone") return true;
  if (audience === "none") return false;
  return getFollowStatus(qc, targetId) === "following";
}

/* ------------------------------------------------------------------ */
/* Stale-cache list filters (backup for the server-side mock filters). */
/* Lists hold ids; resolvers read the canonical entries without fetching.*/
/* ------------------------------------------------------------------ */

/** Keep post ids whose author stays visible to `viewerId`. */
export function filterVisiblePostIds(
  qc: QueryClient,
  postIds: string[],
  getAuthorId: (postId: string) => string | undefined,
  viewerId: string,
): string[] {
  return postIds.filter((id) => {
    const authorId = getAuthorId(id);
    if (!authorId) return true;
    return isPostVisibleToViewer(qc, authorId, viewerId);
  });
}

/** Keep user ids not hidden by safety (for people rows/suggestions). */
export function filterVisibleUserIds(qc: QueryClient, userIds: string[]): string[] {
  return userIds.filter((id) => !isHiddenBySafety(qc, id));
}

/** Keep comment ids whose author is not safety-hidden. */
export function filterVisibleCommentIds(
  qc: QueryClient,
  commentIds: string[],
  getAuthorId: (commentId: string) => string | undefined,
): string[] {
  return commentIds.filter((id) => {
    const authorId = getAuthorId(id);
    if (!authorId) return true;
    return !isHiddenBySafety(qc, authorId);
  });
}

/** Keep notification ids whose actor is not safety-hidden and whose kind is on. */
export function filterVisibleNotificationIds(
  qc: QueryClient,
  notificationIds: string[],
  getNotification: (
    id: string,
  ) => { actorId: string; kind: "like" | "follow" | "post" | "mention" } | undefined,
  isKindOn: (kind: "like" | "follow" | "post" | "mention") => boolean,
): string[] {
  return notificationIds.filter((id) => {
    const item = getNotification(id);
    if (!item) return true;
    if (!isKindOn(item.kind)) return false;
    return !isHiddenBySafety(qc, item.actorId);
  });
}

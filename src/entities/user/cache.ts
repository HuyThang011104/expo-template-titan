/**
 * User canonical cache (G2.1).
 *
 * - Only place allowed to `setQueryData(queryKeys.user…)` for users.
 * - Takes an injected `qc: QueryClient` so tests use a clean instance.
 * - Full `User` overwrites the canonical entry; minimal author snapshots
 *   merge via `mergeAuthorSnapshot` so bio/cover/link survive feed/comment
 *   hydration (no "chỗ cũ chỗ mới").
 */

import type { QueryClient } from "@tanstack/react-query";

import { logger } from "@/shared/observability/logger";
import { queryKeys } from "@/shared/query";

import { updateProfileRemote, type UpdateProfilePayload } from "./api";
import { DEFAULT_PRIVACY_SETTINGS, type User, type UserAuthorSnapshot } from "./model";
import { parseUpdateProfileInput } from "./schema";

/** Overwrite the canonical user. */
export function setUser(qc: QueryClient, user: User): void {
  qc.setQueryData(queryKeys.user(user.id), user);
}

/**
 * Merge a minimal `{ id, handle, displayName, avatarUrl }` snapshot into the
 * canonical entry, preserving G2.1 extended fields (bio/cover/link) when the
 * snapshot does not carry them. Used by search hydrators; post/comment
 * hydrators duplicate this locally (entity-to-entity imports are banned).
 */
export function mergeAuthorSnapshot(qc: QueryClient, author: UserAuthorSnapshot): void {
  const prev = getUserData(qc, author.id);
  if (prev) {
    qc.setQueryData(queryKeys.user(author.id), {
      ...prev,
      ...author,
    });
    return;
  }
  qc.setQueryData(queryKeys.user(author.id), {
    ...author,
    bio: null,
    coverUrl: null,
    link: null,
    privacySettings: { ...DEFAULT_PRIVACY_SETTINGS },
  } satisfies User);
}

/** Read the canonical user (no fetch). */
export function getUserData(qc: QueryClient, id: string): User | undefined {
  return qc.getQueryData<User>(queryKeys.user(id));
}

/**
 * Overwrite every canonical copy of a full `User` (`user(id)`, `me` when it
 * is me, `userByHandle`). Server wins: header + search + comment + inbox
 * update together with no list patching.
 */
export function setUserEverywhere(qc: QueryClient, user: User): void {
  setUser(qc, user);
  qc.setQueryData(queryKeys.userByHandle(user.handle.toLowerCase()), user);
  const me = qc.getQueryData<User>(queryKeys.me);
  if (me && me.id === user.id) {
    qc.setQueryData(queryKeys.me, user);
  } else if (!me) {
    // Cold start (edit before me fetch): seed `me` so header follows.
    qc.setQueryData(queryKeys.me, user);
  }
}

/** Remember a `handle → user` resolution (same canonical entry, second key). */
export function setUserByHandle(qc: QueryClient, handle: string, user: User): void {
  setUser(qc, user);
  qc.setQueryData(queryKeys.userByHandle(handle.toLowerCase()), user);
}

/** Read a cached `handle → user` resolution (no fetch). */
export function getUserByHandleData(qc: QueryClient, handle: string): User | undefined {
  return qc.getQueryData<User>(queryKeys.userByHandle(handle.toLowerCase()));
}

/** Named alias for the feed hydrator — same as `setUser`. */
export function hydrateUser(qc: QueryClient, user: User): void {
  setUser(qc, user);
}

export type UpdateProfileOptions = {
  updateRemote?: typeof updateProfileRemote;
};

/**
 * Edit own profile (G2.1): validate → PATCH `/users/me` → overwrite every
 * canonical copy (`user(id)`, `me`, `userByHandle`) so header + search +
 * comment + inbox update together with no list patching. Throws on invalid
 * input or transport/HTTP errors (callers show the message inline); no auto-retry.
 */
export async function updateProfile(
  qc: QueryClient,
  input: {
    displayName: string;
    bio: string;
    avatarUrl: string | null;
    coverUrl: string | null;
    link: string;
  },
  opts: UpdateProfileOptions = {},
): Promise<User> {
  const parsed = parseUpdateProfileInput(input);
  if (!parsed) throw new Error("Thông tin chưa hợp lệ. Kiểm tra lại tên, bio và link.");
  const payload: UpdateProfilePayload = {
    displayName: parsed.displayName,
    bio: parsed.bio.trim().length > 0 ? parsed.bio.trim() : null,
    avatarUrl: parsed.avatarUrl,
    coverUrl: parsed.coverUrl,
    link: parsed.link.trim().length > 0 ? parsed.link.trim() : null,
  };
  const remote = opts.updateRemote ?? updateProfileRemote;
  let server: User | null = null;
  try {
    server = await remote(payload);
  } catch {
    server = null;
  }
  if (!server) {
    logger.warn("[user] update profile failed, kept local copy");
    throw new Error("Couldn't save your profile. Tap to retry.");
  }
  // Server wins on every canonical copy: profile header reads `me`/`user(id)`,
  // search/comment/inbox read `user(id)`, handle pages read `userByHandle`.
  setUserEverywhere(qc, server);
  return server;
}

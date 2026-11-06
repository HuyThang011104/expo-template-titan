/**
 * Follow list remote API (G1.1).
 *
 * - Lists return `{ users, nextCursor }`; bad items are skipped, `null`
 *   only when the page shape itself is wrong.
 * - No caching here and no `setQueryData`.
 */

import { client } from "@/shared/api";
import { endpoints } from "@/shared/api/endpoints";
import { logger } from "@/shared/observability/logger";

import type { User } from "./model";
import { parseUser } from "./schema";

export type FollowListFetchOptions = {
  fetchImpl?: typeof fetch;
};

export type FollowListPage = {
  users: User[];
  nextCursor: string | null;
};

function parseFollowListPage(data: unknown, scope: string): FollowListPage | null {
  if (data === null || typeof data !== "object" || !("items" in data)) {
    logger.warn("[user] invalid follow list page", { scope });
    return null;
  }
  const raw = data as { items: unknown; nextCursor?: unknown };
  if (!Array.isArray(raw.items)) {
    logger.warn("[user] invalid follow list page", { scope });
    return null;
  }
  const users: User[] = [];
  for (const item of raw.items) {
    const user = parseUser(item);
    if (user) users.push(user);
  }
  return {
    users,
    nextCursor: typeof raw.nextCursor === "string" ? raw.nextCursor : null,
  };
}

/** GET `/users/:id/followers?cursor=` → `FollowListPage | null`. */
export async function fetchFollowersRemote(
  userId: string,
  cursor: string | null,
  opts: FollowListFetchOptions = {},
): Promise<FollowListPage | null> {
  const data = await client.get<unknown>(endpoints.userFollowers(userId, cursor), {
    fetchImpl: opts.fetchImpl,
  });
  return parseFollowListPage(data, "followers");
}

/** GET `/users/:id/following?cursor=` → `FollowListPage | null`. */
export async function fetchFollowingRemote(
  userId: string,
  cursor: string | null,
  opts: FollowListFetchOptions = {},
): Promise<FollowListPage | null> {
  const data = await client.get<unknown>(endpoints.userFollowing(userId, cursor), {
    fetchImpl: opts.fetchImpl,
  });
  return parseFollowListPage(data, "following");
}

/** GET `/follow-requests?cursor=` → `FollowListPage | null` (incoming requests to me). */
export async function fetchFollowRequestsRemote(
  cursor: string | null,
  opts: FollowListFetchOptions = {},
): Promise<FollowListPage | null> {
  const data = await client.get<unknown>(endpoints.followRequests(cursor), {
    fetchImpl: opts.fetchImpl,
  });
  return parseFollowListPage(data, "requests");
}

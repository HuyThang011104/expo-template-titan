/**
 * Relationship remote API (F6).
 *
 * - Calls shared `client` and validates via `parseRelationship`.
 * - Returns `Relationship | null`; callers decide rollback.
 * - Throws on transport/HTTP errors; no caching here and no `setQueryData`.
 */

import { client } from "@/shared/api";
import { endpoints } from "@/shared/api/endpoints";

import type { Relationship } from "./relationship";
import { parseRelationship } from "./relationship-schema";

export type RelationshipFetchOptions = {
  fetchImpl?: typeof fetch;
};

/** GET `/users/:id/relationship` → `Relationship | null`. */
export async function fetchRelationship(
  userId: string,
  opts: RelationshipFetchOptions = {},
): Promise<Relationship | null> {
  const data = await client.get<unknown>(endpoints.userRelationship(userId), {
    fetchImpl: opts.fetchImpl,
  });
  return parseRelationship(data);
}

/** POST `/users/:id/block` → `Relationship | null`. */
export async function blockUserRemote(
  userId: string,
  opts: RelationshipFetchOptions = {},
): Promise<Relationship | null> {
  const data = await client.post<unknown>(endpoints.blockUser(userId), {}, {
    fetchImpl: opts.fetchImpl,
  });
  return parseRelationship(data);
}

/** POST `/users/:id/unblock` → `Relationship | null`. */
export async function unblockUserRemote(
  userId: string,
  opts: RelationshipFetchOptions = {},
): Promise<Relationship | null> {
  const data = await client.post<unknown>(endpoints.unblockUser(userId), {}, {
    fetchImpl: opts.fetchImpl,
  });
  return parseRelationship(data);
}

/** POST `/users/:id/mute` → `Relationship | null`. */
export async function muteUserRemote(
  userId: string,
  opts: RelationshipFetchOptions = {},
): Promise<Relationship | null> {
  const data = await client.post<unknown>(endpoints.muteUser(userId), {}, {
    fetchImpl: opts.fetchImpl,
  });
  return parseRelationship(data);
}

/** POST `/users/:id/unmute` → `Relationship | null`. */
export async function unmuteUserRemote(
  userId: string,
  opts: RelationshipFetchOptions = {},
): Promise<Relationship | null> {
  const data = await client.post<unknown>(endpoints.unmuteUser(userId), {}, {
    fetchImpl: opts.fetchImpl,
  });
  return parseRelationship(data);
}

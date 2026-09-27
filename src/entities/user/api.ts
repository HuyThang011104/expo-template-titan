/**
 * User remote API.
 *
 * - Calls shared `client` and validates via `parseUser`.
 * - Returns `User | null`; `queries.ts` decides throw vs fallback.
 * - No caching here and no `setQueryData`.
 */

import { client } from "@/shared/api";
import { endpoints } from "@/shared/api/endpoints";

import type { User } from "./model";
import { parseUser } from "./schema";

export type FetchOptions = {
  fetchImpl?: typeof fetch;
};

/** GET `/users/:id` → `User | null`. */
export async function fetchUser(id: string, opts: FetchOptions = {}): Promise<User | null> {
  const data = await client.get<unknown>(endpoints.user(id), {
    fetchImpl: opts.fetchImpl,
  });
  return parseUser(data);
}

/** GET `/users/me` → `User | null` (used with `queryKeys.me`). */
export async function fetchMe(opts: FetchOptions = {}): Promise<User | null> {
  const data = await client.get<unknown>(endpoints.me(), { fetchImpl: opts.fetchImpl });
  return parseUser(data);
}

/** GET `/users/handle/:handle` → `User | null`. */
export async function fetchUserByHandle(
  handle: string,
  opts: FetchOptions = {},
): Promise<User | null> {
  const data = await client.get<unknown>(endpoints.userByHandle(handle), {
    fetchImpl: opts.fetchImpl,
  });
  return parseUser(data);
}

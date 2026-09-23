/**
 * User remote API.
 *
 * - Calls shared `client` and validates via `parseUser`.
 * - Returns `User | null`; `queries.ts` decides throw vs fallback.
 * - No caching here and no `setQueryData`.
 */

import { client } from "@/shared/api";

import type { User } from "./model";
import { parseUser } from "./schema";

export type FetchOptions = {
  fetchImpl?: typeof fetch;
};

/** GET `/users/:id` → `User | null`. */
export async function fetchUser(id: string, opts: FetchOptions = {}): Promise<User | null> {
  const data = await client.get<unknown>(`/users/${encodeURIComponent(id)}`, {
    fetchImpl: opts.fetchImpl,
  });
  return parseUser(data);
}

/** GET `/me` → `User | null` (used with `queryKeys.me`). */
export async function fetchMe(opts: FetchOptions = {}): Promise<User | null> {
  const data = await client.get<unknown>("/me", { fetchImpl: opts.fetchImpl });
  return parseUser(data);
}

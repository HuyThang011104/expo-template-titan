/**
 * User privacy remote API (G2.3).
 *
 * - Calls shared `client` and validates via `parseUser` (privacy rides on
 *   the full `User` so every surface keeps one canonical entry).
 * - Returns `User | null`; `privacy-cache.ts` decides throw vs write.
 * - No caching here and no `setQueryData`.
 */

import { client } from "@/shared/api";
import { endpoints } from "@/shared/api/endpoints";

import type { User } from "./model";
import { parseUser } from "./schema";

export type FetchOptions = {
  fetchImpl?: typeof fetch;
};

export type UpdatePrivacyPayload = {
  messageAudience?: "everyone" | "following" | "none";
  postVisibility?: "public" | "followers";
  tagAudience?: "everyone" | "following" | "none";
};

/**
 * PATCH `/users/me/privacy` with a partial privacy payload → `User | null`.
 * Throws on transport/HTTP errors; `null` only means schema validation failed.
 */
export async function updatePrivacyRemote(
  payload: UpdatePrivacyPayload,
  opts: FetchOptions = {},
): Promise<User | null> {
  const data = await client.patch<unknown>(endpoints.updatePrivacy(), payload, {
    fetchImpl: opts.fetchImpl,
  });
  return parseUser(data);
}

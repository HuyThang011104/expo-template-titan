/**
 * Notification preferences remote API (G2.3).
 *
 * - Calls shared `client`, validates via `parseNotifPrefs`.
 * - No caching here; only `prefs-cache.ts` writes the cache.
 */

import { client } from "@/shared/api";
import { endpoints } from "@/shared/api/endpoints";

import { parseNotifPrefs } from "./prefs-schema";
import type { NotifPrefs } from "./prefs";

export type PrefsFetchOptions = {
  fetchImpl?: typeof fetch;
};

/** GET `/notif-prefs` → `NotifPrefs | null`. */
export async function fetchNotifPrefs(
  opts: PrefsFetchOptions = {},
): Promise<NotifPrefs | null> {
  const data = await client.get<unknown>(endpoints.notifPrefs(), {
    fetchImpl: opts.fetchImpl,
  });
  return parseNotifPrefs(data);
}

/** PATCH `/notif-prefs` with a partial patch → `NotifPrefs | null`. */
export async function updateNotifPrefsRemote(
  patch: Partial<NotifPrefs>,
  opts: PrefsFetchOptions = {},
): Promise<NotifPrefs | null> {
  const data = await client.patch<unknown>(endpoints.notifPrefs(), patch, {
    fetchImpl: opts.fetchImpl,
  });
  return parseNotifPrefs(data);
}

/**
 * Notification preferences canonical cache (G2.3).
 *
 * - Only file allowed to `setQueryData(queryKeys.notifPrefs())`.
 * - `updateNotifPref` is read → optimistic flip → server wins → rollback,
 *   then invalidates the inbox list so a killed kind disappears at once.
 * - `isKindMuted` is a pure cache read for client-side list filtering
 *   (backup when the server echo lags); unknown prefs fail open.
 */

import type { QueryClient } from "@tanstack/react-query";

import { logger } from "@/shared/observability/logger";
import { queryKeys } from "@/shared/query";

import { updateNotifPrefsRemote } from "./api-prefs";
import type { NotificationKind } from "./model";
import { DEFAULT_NOTIF_PREFS, prefKeyForKind, type NotifPrefs } from "./prefs";
import { parseUpdateNotifPrefsInput } from "./prefs-schema";

/** Overwrite the canonical prefs. */
export function setNotifPrefs(qc: QueryClient, prefs: NotifPrefs): void {
  qc.setQueryData(queryKeys.notifPrefs(), prefs);
}

/** Read the canonical prefs, defaulting to all-on (no fetch). */
export function getNotifPrefs(qc: QueryClient): NotifPrefs {
  return qc.getQueryData<NotifPrefs>(queryKeys.notifPrefs()) ?? { ...DEFAULT_NOTIF_PREFS };
}

/** Whether a kind is currently muted in the cached prefs. */
export function isKindMuted(qc: QueryClient, kind: NotificationKind): boolean {
  return getNotifPrefs(qc)[prefKeyForKind(kind)] === false;
}

export type UpdateNotifPrefOptions = {
  updateRemote?: typeof updateNotifPrefsRemote;
};

/**
 * Flip one pref with optimistic update; all callers must use this.
 * Throws on invalid input or transport/HTTP errors (callers show inline
 * retry); the inbox list invalidates on success so the killed kind
 * disappears without a manual refetch.
 */
export async function updateNotifPref(
  qc: QueryClient,
  key: keyof NotifPrefs,
  enabled: boolean,
  opts: UpdateNotifPrefOptions = {},
): Promise<NotifPrefs> {
  const prev = getNotifPrefs(qc);
  const input = parseUpdateNotifPrefsInput({ [key]: enabled });
  if (!input) throw new Error("Cài đặt chưa hợp lệ.");
  setNotifPrefs(qc, { ...prev, [key]: enabled });

  const remote = opts.updateRemote ?? updateNotifPrefsRemote;
  try {
    const server = await remote({ [key]: enabled });
    if (server) {
      setNotifPrefs(qc, server);
      void qc.invalidateQueries({ queryKey: queryKeys.notifications() });
      return server;
    }
  } catch {
    // Fall through to rollback below.
  }
  setNotifPrefs(qc, prev);
  logger.warn("[notification] prefs update failed, rolled back", { key });
  throw new Error("Couldn't save your settings. Tap to retry.");
}

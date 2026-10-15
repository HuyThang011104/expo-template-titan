/**
 * Public API for `entities/notification`.
 *
 * Outside code must import from here only — no deep imports.
 * All mark-read flows must go through `markRead`.
 * Does not export: raw schema, fixtures.
 */

export type { Notification, NotificationId, NotificationKind } from "./model";
// Parses wire notifications; raw zod schema stays private.
export { parseNotification } from "./schema";
export {
  DEFAULT_NOTIF_PREFS,
  prefKeyForKind,
  type NotifPrefKey,
  type NotifPrefs,
} from "./prefs";
export { parseNotifPrefs, parseUpdateNotifPrefsInput } from "./prefs-schema";
export {
  fetchNotifPrefs,
  updateNotifPrefsRemote,
  type PrefsFetchOptions,
} from "./api-prefs";
export {
  getNotifPrefs,
  isKindMuted,
  setNotifPrefs,
  updateNotifPref,
} from "./prefs-cache";
export {
  fetchNotification,
  fetchNotificationsPageWire,
  markNotificationReadRemote,
  type FetchOptions as NotificationFetchOptions,
  type NotificationsPageWire,
} from "./api";
export {
  countUnread,
  getNotificationData,
  hydrateNotification,
  markAllReadVisible,
  markRead,
  patchNotification,
  setNotification,
  type MarkReadOptions,
  type MarkReadRemoteFn,
  type NotificationsPageShape,
} from "./cache";
export {
  resolveNotificationHref,
  useCachedNotifPrefs,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifPrefs,
  useNotification,
  useNotifications,
  useUnreadCount,
  useUpdateNotifPref,
  type NotificationsPage,
  type QueryFetchOptions as UseNotificationOptions,
} from "./queries";

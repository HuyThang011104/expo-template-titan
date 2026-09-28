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
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotification,
  useNotifications,
  useUnreadCount,
  type NotificationsPage,
  type QueryFetchOptions as UseNotificationOptions,
} from "./queries";

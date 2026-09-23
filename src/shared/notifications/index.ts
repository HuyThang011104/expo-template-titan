// Public API of `src/shared/notifications`. No deep imports.
export {
  isPushSupportedPlatform,
  needsAndroidChannel,
  registerForPushNotifications,
  saveDeviceToken,
  type DevicePayload,
  type RegisterPushOptions,
} from "./register";
export {
  configureNotificationHandler,
  consumePendingNotificationHref,
  navigateFromNotificationData,
  parsePostNotificationTarget,
  resolveNotificationHref,
  useNotificationObserver,
} from "./handlers";
export { NotificationsBootstrap } from "./notifications-bootstrap";

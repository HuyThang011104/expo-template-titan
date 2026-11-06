/**
 * Semantic icon names mapped to native symbols.
 *
 * Spec: docs/design-system.md §4.7. `SymbolView` only renders on every platform
 * when `name` is an object, so every entry declares iOS, Android, and web.
 */

import type { AndroidSymbol, SFSymbol } from "expo-symbols";

export const iconNames = [
  "home",
  "search",
  "plus",
  "inbox",
  "profile",
  "heart",
  "heartFill",
  "comment",
  "repost",
  "share",
  "bookmark",
  "bookmarkFill",
  "more",
  "back",
  "close",
  "settings",
  "camera",
  "image",
  "send",
  "check",
  "alert",
  "offline",
  "refresh",
  "lock",
  "eye",
  "eyeOff",
  "play",
  "pause",
  "volume",
  "volumeOff",
  "flag",
  "chevronRight",
  "chevronDown",
  "chevronUp",
] as const;

export type IconName = (typeof iconNames)[number];

type PlatformSymbol = {
  ios: SFSymbol;
  android: AndroidSymbol;
  web: AndroidSymbol;
};

export const iconMap = {
  home: { ios: "house", android: "home", web: "home" },
  search: { ios: "magnifyingglass", android: "search", web: "search" },
  plus: { ios: "plus", android: "add", web: "add" },
  inbox: { ios: "tray", android: "inbox", web: "inbox" },
  profile: { ios: "person", android: "person", web: "person" },
  heart: { ios: "heart", android: "favorite_border", web: "favorite_border" },
  heartFill: { ios: "heart.fill", android: "favorite", web: "favorite" },
  comment: { ios: "bubble.right", android: "chat_bubble_outline", web: "chat_bubble_outline" },
  repost: { ios: "arrow.2.squarepath", android: "repeat", web: "repeat" },
  share: { ios: "square.and.arrow.up", android: "share", web: "share" },
  bookmark: { ios: "bookmark", android: "bookmark_border", web: "bookmark_border" },
  bookmarkFill: { ios: "bookmark.fill", android: "bookmark", web: "bookmark" },
  more: { ios: "ellipsis", android: "more_horiz", web: "more_horiz" },
  back: { ios: "chevron.left", android: "arrow_back", web: "arrow_back" },
  close: { ios: "xmark", android: "close", web: "close" },
  settings: { ios: "gearshape", android: "settings", web: "settings" },
  camera: { ios: "camera", android: "photo_camera", web: "photo_camera" },
  image: { ios: "photo", android: "image", web: "image" },
  send: { ios: "paperplane.fill", android: "send", web: "send" },
  check: { ios: "checkmark", android: "check", web: "check" },
  alert: { ios: "exclamationmark.triangle", android: "warning", web: "warning" },
  offline: { ios: "wifi.slash", android: "wifi_off", web: "wifi_off" },
  refresh: { ios: "arrow.clockwise", android: "refresh", web: "refresh" },
  lock: { ios: "lock", android: "lock", web: "lock" },
  eye: { ios: "eye", android: "visibility", web: "visibility" },
  eyeOff: { ios: "eye.slash", android: "visibility_off", web: "visibility_off" },
  play: { ios: "play.fill", android: "play_arrow", web: "play_arrow" },
  pause: { ios: "pause.fill", android: "pause", web: "pause" },
  volume: { ios: "speaker.wave.2.fill", android: "volume_up", web: "volume_up" },
  volumeOff: { ios: "speaker.slash.fill", android: "volume_off", web: "volume_off" },
  flag: { ios: "flag", android: "flag", web: "flag" },
  chevronRight: { ios: "chevron.right", android: "chevron_right", web: "chevron_right" },
  chevronDown: { ios: "chevron.down", android: "keyboard_arrow_down", web: "keyboard_arrow_down" },
  chevronUp: { ios: "chevron.up", android: "keyboard_arrow_up", web: "keyboard_arrow_up" },
} as const satisfies Record<IconName, PlatformSymbol>;

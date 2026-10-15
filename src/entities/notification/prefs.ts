/**
 * Notification preferences model (G2.3).
 *
 * Plain types, standalone (same discipline as `model.ts`).
 * `comment`/`message` are forward-reserved: stored + editable, applied to
 * whatever future kinds use them. `post` (new-post) notices follow `follow`.
 */

import type { NotificationKind } from "./model";

export type NotifPrefKey = "like" | "follow" | "comment" | "mention" | "message";

export type NotifPrefs = Record<NotifPrefKey, boolean>;

export const DEFAULT_NOTIF_PREFS: NotifPrefs = {
  like: true,
  follow: true,
  comment: true,
  mention: true,
  message: true,
};

/**
 * Which pref gates a notification kind. `post` (someone shared) follows the
 * `follow` toggle — those notices only exist for followed authors.
 */
export function prefKeyForKind(kind: NotificationKind): NotifPrefKey {
  switch (kind) {
    case "like":
      return "like";
    case "follow":
      return "follow";
    case "mention":
      return "mention";
    case "post":
      return "follow";
  }
}

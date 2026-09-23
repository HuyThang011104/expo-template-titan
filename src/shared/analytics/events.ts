/**
 * Shared product-event names. Features track these, never ad-hoc strings —
 * the future vendor driver maps 1:1. Screen views stay in
 * `observability/screen-tracking`; this is for user actions.
 */

export const ANALYTICS_EVENTS = {
  feedOpened: "feed_opened",
  feedRefreshed: "feed_refreshed",
  postViewed: "post_viewed",
  postLiked: "post_liked",
  postUnliked: "post_unliked",
  composerOpened: "composer_opened",
  composerPosted: "composer_posted",
  mediaUploaded: "media_uploaded",
  chatOpened: "chat_opened",
  messageSent: "message_sent",
  authSignedIn: "auth_signed_in",
  authSignedOut: "auth_signed_out",
  pushOpened: "push_opened",
} as const;

export type AnalyticsEventName =
  (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

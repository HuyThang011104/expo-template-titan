/**
 * Notification model — plain types (F5).
 *
 * Entity imports shared only. Actor/post previews resolve through the
 * canonical `entities/user` + `entities/post` caches, so ids stay strings here.
 */

export type NotificationId = string;

export type NotificationKind = "like" | "follow" | "post" | "mention";

export type Notification = {
  id: NotificationId;
  kind: NotificationKind;
  /** UserId (string) — kept local to respect the boundary. */
  actorId: string;
  /** PostId (string) when kind is like/post/mention; null for follow. */
  postId: string | null;
  read: boolean;
  /** ISO datetime string. */
  createdAt: string;
};

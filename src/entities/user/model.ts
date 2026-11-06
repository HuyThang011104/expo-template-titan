/**
 * User model — plain types.
 *
 * No imports, so the model stays standalone.
 * Validated in `schema.ts`, fetched in `api.ts`.
 */

export type UserId = string;

export type User = {
  id: UserId;
  handle: string;
  displayName: string;
  avatarUrl: string | null;
  /** G2.1 editable profile fields (null = unset). */
  bio: string | null;
  coverUrl: string | null;
  link: string | null;
  /** G2.3 privacy settings (always present; defaults in `privacy.ts`). */
  privacySettings: PrivacySettings;
};

/** Who may message/tag me. `following` = people I follow. */
export type MessageAudience = "everyone" | "following" | "none";

export type TagAudience = "everyone" | "following" | "none";

/** Who may see my posts. `followers` = followers-only (gated like private). */
export type PostVisibility = "public" | "followers";

export type PrivacySettings = {
  messageAudience: MessageAudience;
  postVisibility: PostVisibility;
  tagAudience: TagAudience;
};

export const DEFAULT_PRIVACY_SETTINGS: PrivacySettings = {
  messageAudience: "everyone",
  postVisibility: "public",
  tagAudience: "everyone",
};

/** Minimal author snapshot duplicated on post/comment wire items. */
export type UserAuthorSnapshot = {
  id: string;
  handle: string;
  displayName: string;
  avatarUrl: string | null;
};

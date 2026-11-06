/**
 * User relationship model (F6 moderation + G1.1 follow).
 *
 * Lives beside `User` but as a separate canonical entry so existing
 * fixtures, schema, and tests for the 4-field `User` keep passing.
 * Unfetched users default to `{ blockedByMe: false, mutedByMe: false,
 * followStatus: "none", ... }` (see `defaultRelationship`).
 *
 * `followersCount` / `followingCount` are denormalized here (not on `User`)
 * so follow/unfollow can patch counts + status in one canonical entry.
 * `blockedByTarget` is server-computed (the target blocked the viewer);
 * the mock serves it from a seeded fixture pair.
 */

export type FollowStatus = "none" | "following" | "requested";

export type Relationship = {
  userId: string;
  blockedByMe: boolean;
  mutedByMe: boolean;
  followStatus: FollowStatus;
  followersCount: number;
  followingCount: number;
  /** True when the target's posts are followers-only. */
  isPrivate: boolean;
  /** True when the target blocked the viewer (reverse direction). */
  blockedByTarget: boolean;
  /** ISO datetime string. */
  updatedAt: string;
};

/**
 * User relationship model (F6 moderation).
 *
 * Lives beside `User` but as a separate canonical entry so existing
 * fixtures, schema, and tests for the 4-field `User` keep passing.
 * Unfetched users default to `{ blockedByMe: false, mutedByMe: false }`.
 */

export type Relationship = {
  userId: string;
  blockedByMe: boolean;
  mutedByMe: boolean;
  /** ISO datetime string. */
  updatedAt: string;
};

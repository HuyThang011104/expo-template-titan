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
};

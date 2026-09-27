/**
 * Search response schema (F3).
 *
 * Wraps entity parsers — features never redefine `Post`/`User`.
 * Invalid items/users are skipped; `null` only when the page shape itself is bad.
 */

import { parseFeedWireItem, type FeedWireItem } from "@/entities/post";
import { parseUser, type User } from "@/entities/user";
import { logger } from "@/shared/observability/logger";

export type SearchPageWire = {
  users: User[];
  items: FeedWireItem[];
  nextCursor: string | null;
};

/** Parse `unknown` search response → `SearchPageWire | null` (no throw). */
export function parseSearchPage(data: unknown): SearchPageWire | null {
  if (data === null || typeof data !== "object") {
    logger.warn("[search] invalid page shape");
    return null;
  }
  const raw = data as { users?: unknown; items?: unknown; nextCursor?: unknown };
  if (!Array.isArray(raw.users) || !Array.isArray(raw.items)) {
    logger.warn("[search] invalid page shape");
    return null;
  }
  const users: User[] = [];
  for (const entry of raw.users) {
    const parsed = parseUser(entry);
    if (parsed) users.push(parsed);
  }
  const items: FeedWireItem[] = [];
  for (const entry of raw.items) {
    const parsed = parseFeedWireItem(entry);
    if (parsed) items.push(parsed);
  }
  return {
    users,
    items,
    nextCursor: typeof raw.nextCursor === "string" ? raw.nextCursor : null,
  };
}

/** Minimum normalized query length before fetching. */
export const SEARCH_MIN_LENGTH = 2;

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

/** Normalize `#Tag` → `tag` (strip leading #, trim, lowercase). */
export function normalizeHashtag(tag: string): string {
  return tag.trim().toLowerCase().replace(/^#+/, "");
}

export type HashtagInfo = {
  tag: string;
  postCount: number;
  updatedAt: string;
};

function parseHashtagInfo(data: unknown): HashtagInfo | null {
  if (data === null || typeof data !== "object") return null;
  const raw = data as { tag?: unknown; postCount?: unknown; updatedAt?: unknown };
  if (typeof raw.tag !== "string" || raw.tag.trim().length === 0) return null;
  if (typeof raw.postCount !== "number" || !Number.isInteger(raw.postCount) || raw.postCount < 0) {
    return null;
  }
  if (typeof raw.updatedAt !== "string") return null;
  return { tag: normalizeHashtag(raw.tag), postCount: raw.postCount, updatedAt: raw.updatedAt };
}

export type HashtagPageWire = {
  items: FeedWireItem[];
  nextCursor: string | null;
  /** G2.2 header count; null when the server omits it (G1 compat). */
  tag: string | null;
  postCount: number | null;
};

/** Parse `unknown` hashtag response → `HashtagPageWire | null` (no throw). */
export function parseHashtagPage(data: unknown): HashtagPageWire | null {
  if (data === null || typeof data !== "object") {
    logger.warn("[search] invalid hashtag page shape");
    return null;
  }
  const raw = data as {
    items?: unknown;
    nextCursor?: unknown;
    tag?: unknown;
    postCount?: unknown;
  };
  if (!Array.isArray(raw.items)) {
    logger.warn("[search] invalid hashtag page shape");
    return null;
  }
  const items: FeedWireItem[] = [];
  for (const entry of raw.items) {
    const parsed = parseFeedWireItem(entry);
    if (parsed) items.push(parsed);
  }
  return {
    items,
    nextCursor: typeof raw.nextCursor === "string" ? raw.nextCursor : null,
    tag: typeof raw.tag === "string" ? normalizeHashtag(raw.tag) : null,
    postCount:
      typeof raw.postCount === "number" && Number.isInteger(raw.postCount) && raw.postCount >= 0
        ? raw.postCount
        : null,
  };
}

export type TrendingPageWire = {
  tags: HashtagInfo[];
  users: User[];
};

/** Parse `unknown` trending response → `TrendingPageWire | null` (no throw). */
export function parseTrendingPage(data: unknown): TrendingPageWire | null {
  if (data === null || typeof data !== "object") {
    logger.warn("[search] invalid trending shape");
    return null;
  }
  const raw = data as { tags?: unknown; users?: unknown };
  if (!Array.isArray(raw.tags) || !Array.isArray(raw.users)) {
    logger.warn("[search] invalid trending shape");
    return null;
  }
  const tags: HashtagInfo[] = [];
  for (const entry of raw.tags) {
    const parsed = parseHashtagInfo(entry);
    if (parsed) tags.push(parsed);
  }
  const users: User[] = [];
  for (const entry of raw.users) {
    const parsed = parseUser(entry);
    if (parsed) users.push(parsed);
  }
  return { tags, users };
}

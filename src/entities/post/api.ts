/**
 * Post remote API.
 *
 * - Calls `client`, validates via `parsePost`, returns `Post | null`.
 * - No caching here; only `cache.ts` writes the cache.
 */

import { client } from "@/shared/api";
import { endpoints } from "@/shared/api/endpoints";
import { logger } from "@/shared/observability/logger";

import type { FeedWireItem, Post } from "./model";
import { parseFeedWireItem, parsePost } from "./schema";

export type FetchOptions = {
  fetchImpl?: typeof fetch;
};

/** GET `/posts/:id` → `Post | null`. */
export async function fetchPost(id: string, opts: FetchOptions = {}): Promise<Post | null> {
  const data = await client.get<unknown>(`/posts/${encodeURIComponent(id)}`, {
    fetchImpl: opts.fetchImpl,
  });
  return parsePost(data);
}

/**
 * POST `/posts/:id/like` with `{ liked }`; `null` on invalid schema.
 */
export async function likePostRemote(
  id: string,
  liked: boolean,
  opts: FetchOptions = {},
): Promise<Post | null> {
  const data = await client.post<unknown>(
    `/posts/${encodeURIComponent(id)}/like`,
    { liked },
    { fetchImpl: opts.fetchImpl },
  );
  return parsePost(data);
}

/**
 * POST `/posts` with `{ body, mediaIds }` → `Post | null`.
 * Throws on transport/HTTP errors (callers decide retry vs outbox);
 * `null` only means the server payload failed schema validation.
 */
export async function createPostRemote(
  body: string,
  mediaIds: string[],
  opts: FetchOptions = {},
): Promise<Post | null> {
  const data = await client.post<unknown>(
    endpoints.createPost(),
    { body, mediaIds },
    { fetchImpl: opts.fetchImpl },
  );
  return parsePost(data);
}

export type UserPostsPage = {
  items: FeedWireItem[];
  nextCursor: string | null;
};

/**
 * GET `/users/:id/posts?cursor=` → parsed wire items.
 * `null` only when the page shape itself is invalid; individual bad
 * items are skipped (same rule as the home feed).
 */
export async function fetchUserPostsRemote(
  userId: string,
  cursor: string | null,
  opts: FetchOptions = {},
): Promise<UserPostsPage | null> {
  const data: unknown = await client.get<unknown>(endpoints.userPosts(userId, cursor), {
    fetchImpl: opts.fetchImpl,
  });
  if (
    data === null ||
    typeof data !== "object" ||
    !("items" in data) ||
    !Array.isArray((data as { items: unknown }).items)
  ) {
    logger.warn("[post] invalid user-posts page shape", { userId, cursor });
    return null;
  }
  const raw = data as { items: unknown[]; nextCursor?: unknown };
  const items: FeedWireItem[] = [];
  for (const item of raw.items) {
    const parsed = parseFeedWireItem(item);
    if (parsed) items.push(parsed);
  }
  return {
    items,
    nextCursor: typeof raw.nextCursor === "string" ? raw.nextCursor : null,
  };
}

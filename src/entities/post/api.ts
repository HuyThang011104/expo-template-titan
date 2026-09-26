/**
 * Post remote API.
 *
 * - Calls `client`, validates via `parsePost`, returns `Post | null`.
 * - No caching here; only `cache.ts` writes the cache.
 */

import { client } from "@/shared/api";
import { endpoints } from "@/shared/api/endpoints";

import type { Post } from "./model";
import { parsePost } from "./schema";

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

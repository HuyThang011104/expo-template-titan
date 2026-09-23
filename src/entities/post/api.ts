/**
 * Post remote API.
 *
 * - Calls `client`, validates via `parsePost`, returns `Post | null`.
 * - No caching here; only `cache.ts` writes the cache.
 */

import { client } from "@/shared/api";

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

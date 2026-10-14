/**
 * Comment remote API (G1.2).
 *
 * - Calls shared `client` and validates via `parseComment*`.
 * - Lists return `{ items, nextCursor } | null` (null = bad page shape;
 *   bad items are skipped). Single writes return `Comment | null`.
 * - Throws on transport/HTTP errors; no caching here and no `setQueryData`.
 */

import { client } from "@/shared/api";
import { endpoints } from "@/shared/api/endpoints";
import { logger } from "@/shared/observability/logger";

import type { Comment, CommentWireItem } from "./model";
import { parseComment, parseCommentWireItem } from "./schema";

export type FetchOptions = {
  fetchImpl?: typeof fetch;
};

export type CommentsRemotePage = {
  items: CommentWireItem[];
  nextCursor: string | null;
};

/** GET `/posts/:postId/comments?cursor=` → parsed wire page or `null`. */
export async function fetchPostCommentsRemote(
  postId: string,
  cursor: string | null,
  opts: FetchOptions = {},
): Promise<CommentsRemotePage | null> {
  const data: unknown = await client.get<unknown>(endpoints.postComments(postId, cursor), {
    fetchImpl: opts.fetchImpl,
  });
  if (
    data === null ||
    typeof data !== "object" ||
    !("items" in data) ||
    !Array.isArray((data as { items: unknown }).items)
  ) {
    logger.warn("[comment] invalid page shape", { postId, cursor });
    return null;
  }
  const raw = data as { items: unknown[]; nextCursor?: unknown };
  const items: CommentWireItem[] = [];
  for (const item of raw.items) {
    const parsed = parseCommentWireItem(item);
    if (parsed) items.push(parsed);
  }
  return {
    items,
    nextCursor: typeof raw.nextCursor === "string" ? raw.nextCursor : null,
  };
}

/**
 * POST `/posts/:postId/comments` with `{ body, parentId }` → `Comment | null`.
 * Throws on transport/HTTP errors (callers show inline error + retry);
 * `null` only means the server payload failed schema validation.
 */
export async function createCommentRemote(
  postId: string,
  body: string,
  parentId: string | null,
  opts: FetchOptions = {},
): Promise<Comment | null> {
  const data = await client.post<unknown>(
    endpoints.createComment(postId),
    { body, parentId },
    { fetchImpl: opts.fetchImpl },
  );
  return parseComment(data);
}

/** POST `/comments/:id/like` with `{ liked }` → `Comment | null`. */
export async function likeCommentRemote(
  id: string,
  liked: boolean,
  opts: FetchOptions = {},
): Promise<Comment | null> {
  const data = await client.post<unknown>(
    endpoints.likeComment(id),
    { liked },
    { fetchImpl: opts.fetchImpl },
  );
  return parseComment(data);
}

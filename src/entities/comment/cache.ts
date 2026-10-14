/**
 * Comment canonical cache (G1.2).
 *
 * - Only file allowed to `setQueryData(queryKeys.comment…)` or patch the
 *   per-post comment id lists. Features call these helpers, never `setQueryData`.
 * - `hydrateCommentItem` writes the comment plus its author snapshot into the
 *   canonical user entry (same discipline as `hydrateFeedItem`); lists hold ids.
 * - `likeComment` is read → optimistic flip → server wins → rollback.
 * - `addComment` inserts the new id without a full refetch: top-level
 *   prepends page 0 (newest-first); a reply splices after its parent's group
 *   (oldest-last). A reply whose parent is not loaded invalidates the list.
 */

import type { InfiniteData, QueryClient } from "@tanstack/react-query";

import { logger } from "@/shared/observability/logger";
import { queryKeys } from "@/shared/query";

import { createCommentRemote, likeCommentRemote } from "./api";
import type { Comment, CommentWireItem } from "./model";
import { parseCreateCommentInput } from "./schema";

export type CommentsPageShape = {
  commentIds: string[];
  nextCursor: string | null;
};

/** Overwrite the canonical comment. */
export function setComment(qc: QueryClient, comment: Comment): void {
  qc.setQueryData(queryKeys.comment(comment.id), comment);
}

/** Read the canonical comment (no fetch). */
export function getCommentData(qc: QueryClient, id: string): Comment | undefined {
  return qc.getQueryData<Comment>(queryKeys.comment(id));
}

/** Merge a patch into the canonical entry; `undefined` when missing. */
export function patchComment(
  qc: QueryClient,
  id: string,
  patch: Partial<Comment>,
): Comment | undefined {
  const prev = getCommentData(qc, id);
  if (!prev) return undefined;
  const next: Comment = { ...prev, ...patch };
  qc.setQueryData(queryKeys.comment(id), next);
  return next;
}

/** Hydrate one `{ comment, author }` wire item; returns `{ commentId }`. */
export function hydrateCommentItem(
  qc: QueryClient,
  item: CommentWireItem,
): { commentId: string } {
  setComment(qc, item.comment);
  qc.setQueryData(queryKeys.user(item.author.id), item.author);
  return { commentId: item.comment.id };
}

export type LikeCommentRemoteFn = typeof likeCommentRemote;

export type LikeCommentOptions = {
  likeRemote?: LikeCommentRemoteFn;
};

/** Like/unlike with cross-surface optimistic update; all callers must use this. */
export async function likeComment(
  qc: QueryClient,
  id: string,
  opts: LikeCommentOptions = {},
): Promise<void> {
  const prev = getCommentData(qc, id);
  // No canonical entry → skip here, do not fetch.
  if (!prev) return;

  const liked = !prev.likedByMe;
  patchComment(qc, id, {
    likedByMe: liked,
    likeCount: Math.max(0, prev.likeCount + (liked ? 1 : -1)),
  });

  const remote = opts.likeRemote ?? likeCommentRemote;
  try {
    const server = await remote(id, liked);
    // Server wins on a valid comment; `null` means failure → rollback.
    if (server) {
      setComment(qc, server);
      return;
    }
  } catch {
    // Fall through to rollback below.
  }
  setComment(qc, prev);
  logger.warn("[comment] like failed, rolled back", { commentId: id });
}

export type CreateCommentOptions = {
  createRemote?: typeof createCommentRemote;
};

/**
 * Post a comment and insert it into the list without refetching.
 * Throws on transport/HTTP errors and on invalid input (callers show the
 * message inline); no auto-retry and no optimistic temp row, so a tap can
 * never double-post (the send button locks while pending).
 */
export async function createComment(
  qc: QueryClient,
  postId: string,
  body: string,
  parentId: string | null,
  opts: CreateCommentOptions = {},
): Promise<Comment> {
  const input = parseCreateCommentInput({ body, parentId });
  if (!input) throw new Error("Comment must be 1–500 characters.");
  if (parentId !== null) {
    const parent = getCommentData(qc, parentId);
    if (!parent || parent.postId !== postId) {
      throw new Error("The comment you reply to is no longer available.");
    }
  }

  const remote = opts.createRemote ?? createCommentRemote;
  const created = await remote(postId, input.body, input.parentId);
  if (!created) throw new Error("Couldn't post your comment. Tap to retry.");
  addComment(qc, postId, created);
  return created;
}

/** Insert a server-created comment id into the per-post list pages. */
export function addComment(qc: QueryClient, postId: string, comment: Comment): void {
  setComment(qc, comment);
  const key = queryKeys.postComments(postId);
  const data = qc.getQueryData<InfiniteData<CommentsPageShape, string | null>>(key);
  if (!data) {
    qc.setQueryData<InfiniteData<CommentsPageShape, string | null>>(key, {
      pages: [{ commentIds: [comment.id], nextCursor: null }],
      pageParams: [null],
    });
    return;
  }
  if (comment.parentId === null) {
    qc.setQueryData<InfiniteData<CommentsPageShape, string | null>>(key, (old) => {
      if (!old) return old;
      const [first, ...rest] = old.pages;
      if (!first || first.commentIds.includes(comment.id)) return old;
      return {
        ...old,
        pages: [{ ...first, commentIds: [comment.id, ...first.commentIds] }, ...rest],
      };
    });
    return;
  }
  // Reply: splice after its parent's group (parent + existing replies).
  const flat = data.pages.flatMap((page) => page.commentIds);
  if (flat.includes(comment.id)) return;
  let insertAt = flat.indexOf(comment.parentId);
  if (insertAt === -1) {
    void qc.invalidateQueries({ queryKey: key });
    return;
  }
  insertAt += 1;
  while (insertAt < flat.length) {
    const next = getCommentData(qc, flat[insertAt] ?? "");
    if (!next || next.parentId !== comment.parentId) break;
    insertAt += 1;
  }
  const target = insertAt;
  qc.setQueryData<InfiniteData<CommentsPageShape, string | null>>(key, (old) => {
    if (!old) return old;
    let remaining = target;
    const pages = old.pages.map((page) => {
      if (remaining < 0) return page;
      if (remaining <= page.commentIds.length) {
        const ids = [...page.commentIds];
        ids.splice(remaining, 0, comment.id);
        remaining = -1;
        return { ...page, commentIds: ids };
      }
      remaining -= page.commentIds.length;
      return page;
    });
    return { ...old, pages };
  });
}

/**
 * Comment thread builder (G1.2).
 *
 * Pure function: top-level comments (`parentId === null`) newest-first,
 * each followed by its replies oldest-first (indent level 1). Replies whose
 * parent is missing render as top-level so nothing silently disappears.
 * New top-level comments prepend (newest); new replies append to their
 * parent's group (oldest-last) — the order is explicit in the UI header.
 */

import type { Comment, CommentThreadRow } from "./model";

function byNewestFirst(a: Comment, b: Comment): number {
  return b.createdAt.localeCompare(a.createdAt);
}

function byOldestFirst(a: Comment, b: Comment): number {
  return a.createdAt.localeCompare(b.createdAt);
}

/** Flatten comments into display rows with indent depth. */
export function buildCommentThread(comments: Comment[]): CommentThreadRow[] {
  const byId = new Map(comments.map((comment) => [comment.id, comment]));
  const tops = comments
    .filter((comment) => comment.parentId === null || !byId.has(comment.parentId))
    .sort(byNewestFirst);
  const replies = comments
    .filter((comment) => comment.parentId !== null && byId.has(comment.parentId))
    .sort(byOldestFirst);

  const rows: CommentThreadRow[] = [];
  for (const top of tops) {
    rows.push({ comment: top, depth: 0 });
    for (const reply of replies) {
      if (reply.parentId === top.id) rows.push({ comment: reply, depth: 1 });
    }
  }
  return rows;
}

/**
 * Comment thread builder (G1.2).
 *
 * Pure function: top-level comments (`parentId === null`) newest-first.
 * Replies are collapsed by default: a top row carries its `replyCount` and
 * only emits reply rows when its parent id is in `expandedIds`. Expanded
 * replies are oldest-first (indent level 1). Replies whose parent is missing
 * render as top-level so nothing silently disappears.
 * New top-level comments prepend (newest); new replies append to their
 * parent's group (oldest-last) — the order is explicit in the UI header.
 */

import type { Comment, CommentThreadRow } from "./model";

export type BuildCommentThreadOptions = {
  /** Parent comment ids whose replies are currently expanded. */
  expandedIds?: ReadonlySet<string>;
};

const NO_EXPANDED: ReadonlySet<string> = new Set();

function byNewestFirst(a: Comment, b: Comment): number {
  return b.createdAt.localeCompare(a.createdAt);
}

function byOldestFirst(a: Comment, b: Comment): number {
  return a.createdAt.localeCompare(b.createdAt);
}

/** Flatten comments into display rows with indent depth and reply counts. */
export function buildCommentThread(
  comments: Comment[],
  options: BuildCommentThreadOptions = {},
): CommentThreadRow[] {
  const expandedIds = options.expandedIds ?? NO_EXPANDED;
  const byId = new Map(comments.map((comment) => [comment.id, comment]));
  const tops = comments
    .filter((comment) => comment.parentId === null || !byId.has(comment.parentId))
    .sort(byNewestFirst);
  const replies = comments
    .filter((comment) => comment.parentId !== null && byId.has(comment.parentId))
    .sort(byOldestFirst);

  const repliesByParent = new Map<string, Comment[]>();
  for (const reply of replies) {
    const parentId = reply.parentId;
    if (parentId === null) continue;
    const group = repliesByParent.get(parentId);
    if (group) group.push(reply);
    else repliesByParent.set(parentId, [reply]);
  }

  const rows: CommentThreadRow[] = [];
  for (const top of tops) {
    const topReplies = repliesByParent.get(top.id) ?? [];
    const expanded = expandedIds.has(top.id);
    rows.push({
      comment: top,
      depth: 0,
      replyCount: topReplies.length,
      repliesExpanded: expanded,
    });
    if (expanded) {
      for (const reply of topReplies) {
        rows.push({
          comment: reply,
          depth: 1,
          replyCount: 0,
          repliesExpanded: false,
        });
      }
    }
  }
  return rows;
}

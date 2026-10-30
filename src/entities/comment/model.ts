/**
 * Comment model — plain types (G1.2).
 *
 * Entity imports shared only, so `authorId` stays a plain string and the
 * wire `author` duplicates the User shape (same rule as `FeedWireItem`).
 * Two levels only: `parentId` is null (top-level) or a top-level id (reply).
 */

export type CommentId = string;

export type Comment = {
  id: CommentId;
  postId: string;
  /** UserId (string) — kept local to respect the boundary. */
  authorId: string;
  body: string;
  /** Null for top-level; otherwise the top-level comment id. */
  parentId: string | null;
  likeCount: number;
  likedByMe: boolean;
  /** ISO datetime string. */
  createdAt: string;
};

/** Comment item on the wire: `{ comment, author }`. */
export type CommentWireItem = {
  comment: Comment;
  author: {
    id: string;
    handle: string;
    displayName: string;
    avatarUrl: string | null;
  };
};

/** One display row: a comment plus its indent level (0 or 1). */
export type CommentThreadRow = {
  comment: Comment;
  depth: 0 | 1;
  /** Only meaningful for depth 0: number of replies to this comment. */
  replyCount: number;
  /** Only meaningful for depth 0: whether those replies are shown inline. */
  repliesExpanded: boolean;
};

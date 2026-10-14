/**
 * Public API for `entities/comment`.
 *
 * Outside code must import from here only — no deep imports.
 * All likes/creates must go through `likeComment` / `createComment`.
 * Does not export: raw schema.
 */

export type { Comment, CommentId, CommentThreadRow, CommentWireItem } from "./model";
export {
  createCommentRemote,
  fetchPostCommentsRemote,
  likeCommentRemote,
  type CommentsRemotePage,
  type FetchOptions as CommentFetchOptions,
} from "./api";
// Parses wire items + create input; raw zod schemas stay private.
export {
  COMMENT_MAX_LENGTH,
  parseComment,
  parseCommentWireItem,
  parseCreateCommentInput,
  type CreateCommentInput,
} from "./schema";
export { buildCommentThread } from "./thread";
export {
  addComment,
  createComment,
  getCommentData,
  hydrateCommentItem,
  likeComment,
  patchComment,
  setComment,
  type CommentsPageShape,
  type CreateCommentOptions,
  type LikeCommentOptions,
  type LikeCommentRemoteFn,
} from "./cache";
export {
  useComment,
  useCreateComment,
  useLikeComment,
  usePostComments,
  type CreateCommentArgs,
  type PostCommentsPage,
  type QueryFetchOptions as UseCommentOptions,
} from "./queries";
export { CommentRow, type CommentRowProps } from "./ui/comment-row";

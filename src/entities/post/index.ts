/**
 * Public API for `entities/post`.
 *
 * Outside code must import from here only — no deep imports.
 * All likes must go through `likePost`.
 * Does not export: raw schema, `__fixtures__`.
 */

export type { FeedWireItem, Post, PostId, PostMedia, PostMediaKind } from "./model";
export {
  createPostRemote,
  fetchPost,
  fetchUserPostsRemote,
  likePostRemote,
  type FetchOptions as PostFetchOptions,
  type UserPostsPage as UserPostsRemotePage,
} from "./api";
// Parses wire feed items + composer input; raw zod schemas stay private.
export { parseCreatePostInput, parseFeedWireItem, type CreatePostInput } from "./schema";
export {
  addCreatedPost,
  getPostData,
  hydrateFeedItem,
  likePost,
  patchPost,
  setPost,
  type LikePostOptions,
  type LikeRemoteFn,
} from "./cache";
export {
  useCreatePost,
  useLikePost,
  usePost,
  usePostAuthor,
  useUserPosts,
  type PostAuthor,
  type QueryFetchOptions as UsePostOptions,
  type UserPostsPage,
} from "./queries";
export { PostActions, type PostActionsProps } from "./ui/post-actions";
export { PostCard, type PostCardProps } from "./ui/post-card";

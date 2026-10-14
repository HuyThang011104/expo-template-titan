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
  deletePostRemote,
  fetchPost,
  fetchUserPostsRemote,
  likePostRemote,
  updatePostRemote,
  type FetchOptions as PostFetchOptions,
  type UserPostsPage as UserPostsRemotePage,
} from "./api";
// Parses wire feed items + composer/edit input; raw zod schemas stay private.
export {
  parseCreatePostInput,
  parseFeedWireItem,
  parseUpdatePostInput,
  type CreatePostInput,
  type UpdatePostInput,
} from "./schema";
export {
  addCreatedPost,
  deletePost,
  getPostData,
  hydrateFeedItem,
  likePost,
  patchPost,
  removePostEverywhere,
  setPost,
  updatePost,
  type DeletePostOptions,
  type LikePostOptions,
  type LikeRemoteFn,
  type UpdatePostOptions,
} from "./cache";
export {
  useCreatePost,
  useDeletePost,
  useLikePost,
  usePost,
  usePostAuthor,
  useUpdatePost,
  useUserPosts,
  useViewerId,
  type PostAuthor,
  type QueryFetchOptions as UsePostOptions,
  type UserPostsPage,
} from "./queries";
export { PostActions, type PostActionsProps } from "./ui/post-actions";
export { PostCard, type PostCardProps } from "./ui/post-card";
export { PostOwnerMenu, type PostOwnerMenuProps } from "./ui/post-owner-menu";
export { PostShareButton, type PostShareButtonProps, type ShareFn } from "./ui/post-share-button";
export { PostVideo, type PostVideoProps } from "./ui/post-video";

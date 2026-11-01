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
// Parses wire feed items + composer/edit input + rich text; raw zod schemas stay private.
export {
  parseCreatePostInput,
  parseFeedWireItem,
  parseUpdatePostInput,
  type CreatePostInput,
  type UpdatePostInput,
} from "./schema";
export { parseRichText, type RichSegment } from "./rich-text";
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
export { MediaGrid, type MediaGridProps } from "./ui/media-grid";
export { PostActions, type PostActionsProps } from "./ui/post-actions";
export { PostBody, type PostBodyProps } from "./ui/post-body";
export { PostCard, type PostCardProps } from "./ui/post-card";
export {
  PostOptionsSheet,
  type PostOptionsSheetHandle,
  type PostOptionsSheetProps,
} from "./ui/post-options-sheet";
export { PostOwnerMenu, type PostOwnerMenuProps } from "./ui/post-owner-menu";
export { PostShareButton, type PostShareButtonProps, type ShareFn } from "./ui/post-share-button";
export { PostVideo, type PostVideoProps } from "./ui/post-video";

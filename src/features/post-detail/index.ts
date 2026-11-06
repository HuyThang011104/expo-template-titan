// Public API for `features/post-detail`.
// `PostDetailScreen` reads the entity `PostCard` (correct feature-to-entity direction).
// Routes must import from here only — no deep imports.
export { MediaViewerScreen } from "./screens/media-viewer-screen";
export { PostDetailScreen } from "./screens/post-detail-screen";
export { EditPostScreen, handleEditPostDismiss } from "./screens/edit-post-screen";
export { CommentComposer, type ReplyTarget } from "./components/comment-composer";
export { CommentsList } from "./components/comments-list";

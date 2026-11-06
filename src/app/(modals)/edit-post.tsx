// Thin route: re-exports the feature screen.
// URL after group strip: `/edit-post?postId=` (owner-only, text edit).
// No fetch hooks, no atomic UI here.
export { EditPostScreen as default } from "@/features/post-detail";

// Thin route: re-exports the feature screen.
// Media viewer belongs to `post-detail`, not `composer`.
// No fetch hooks, no atomic UI here.
export { MediaViewerScreen as default } from "@/features/post-detail";

// Thin route: re-exports the feature screen.
// URL after group strip: `/post/[id]`. Pushed from the root stack, no tab array group.
// No fetch hooks, no atomic UI here.
export { PostDetailScreen as default } from "@/features/post-detail";

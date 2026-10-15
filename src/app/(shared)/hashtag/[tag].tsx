// Thin route: re-exports the feature screen.
// URL after group strip: `/hashtag/[tag]` (G1 posts-only tag page).
// No fetch hooks, no atomic UI here.
export { HashtagScreen as default } from "@/features/search";

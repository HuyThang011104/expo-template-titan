// Thin route: re-exports the feature screen.
// URL after group strip: `/user/[handle]/following`.
// No fetch hooks, no atomic UI here.
export { FollowingScreen as default } from "@/features/profile";

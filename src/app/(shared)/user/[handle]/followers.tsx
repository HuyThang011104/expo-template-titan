// Thin route: re-exports the feature screen.
// URL after group strip: `/user/[handle]/followers`.
// No fetch hooks, no atomic UI here.
export { FollowersScreen as default } from "@/features/profile";

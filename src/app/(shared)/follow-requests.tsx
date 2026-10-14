// Thin route: re-exports the feature screen.
// URL after group strip: `/follow-requests` (incoming requests to me).
// No fetch hooks, no atomic UI here.
export { FollowRequestsScreen as default } from "@/features/profile";

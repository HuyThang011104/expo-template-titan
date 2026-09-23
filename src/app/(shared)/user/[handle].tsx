// Thin route: re-exports the feature screen.
// URL after group strip: `/user/[handle]` ("me" lives in the profile tab).
// No fetch hooks, no atomic UI here.
export { UserDetailScreen as default } from "@/features/profile";

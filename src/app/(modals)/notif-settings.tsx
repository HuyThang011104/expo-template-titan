// Thin route: re-exports the feature screen.
// URL after group strip: `/notif-settings` (own notification prefs, G2.3).
// No fetch hooks, no atomic UI here.
export { NotifSettingsScreen as default } from "@/features/settings";

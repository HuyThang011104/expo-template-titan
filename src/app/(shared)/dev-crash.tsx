// Thin route: re-exports the feature screen.
// Hidden Sentry check: no tab/stack links, open via `titan-dev://dev-crash` when logged in.
// No fetch hooks, no atomic UI here.
export { DevCrashScreen as default } from "@/features/dev-crash";

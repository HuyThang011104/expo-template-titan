// Public API of `src/shared/analytics`. No deep imports.
export {
  identify,
  resetAnalytics,
  resetAnalyticsHubForTests,
  setAnalyticsDriver,
  setAnalyticsEnabled,
  trackEvent,
} from "./client";
export { ANALYTICS_EVENTS, type AnalyticsEventName } from "./events";
export { consoleDriver, noopDriver, type AnalyticsDriver, type AnalyticsProps } from "./drivers";

/**
 * Screen tracking.
 *
 * Root-mounted component reads pathname + search params and calls
 * `trackScreen()` on change. Never imports `@react-navigation/*`.
 */

import { useEffect } from "react";
import { useGlobalSearchParams, usePathname } from "expo-router";

import { logger } from "./logger";
import { addScreenBreadcrumb } from "./sentry";

const SENSITIVE_PARAM_PATTERN = /(token|password|secret|authorization)/i;

export type ScreenParams = Record<string, string | string[] | undefined>;

/** Pure helper: builds a stable screen name from pathname + params. */
export function buildScreenName(
  pathname: string | null | undefined,
  params?: ScreenParams,
): string {
  const base = pathname && pathname.length > 0 ? pathname : "(unknown)";
  if (!params) return base;
  const keys = Object.keys(params)
    .filter((key) => params[key] !== undefined)
    .sort();
  if (keys.length === 0) return base;
  const query = keys
    .map((key) => {
      const value = params[key];
      const rendered = SENSITIVE_PARAM_PATTERN.test(key)
        ? "[REDACTED]"
        : Array.isArray(value)
          ? value.join(",")
          : String(value);
      return `${key}=${rendered}`;
    })
    .join("&");
  return `${base}?${query}`;
}

/** Records a Sentry breadcrumb + debug log. Never throws. */
export function trackScreen(pathname: string | null | undefined, params?: ScreenParams): string {
  const name = buildScreenName(pathname, params);
  addScreenBreadcrumb(name);
  logger.debug("[screen]", name);
  return name;
}

/**
 * Mounted once via `ObservabilityBootstrap`. Renders `null` — no UI.
 */
export function ScreenTracking() {
  const pathname = usePathname();
  const params = useGlobalSearchParams() as ScreenParams;

  const paramsKey = JSON.stringify(params);

  useEffect(() => {
    try {
      const parsed = JSON.parse(paramsKey) as ScreenParams;
      trackScreen(pathname, parsed);
    } catch {
      trackScreen(pathname);
    }
     
  }, [pathname, paramsKey]);

  return null;
}

/**
 * Vendor-agnostic analytics hub.
 *
 * ASSUMPTIONS (explicit until a vendor is chosen):
 * - Dev uses `consoleDriver`, prod uses `noopDriver` — events are defined
 *   (`events.ts`) and call sites are real, only the backend sink is missing.
 * - Identity is a plain user id attached at `track()` time; no buffering —
 *   events fired before `identify()` ship without `userId`.
 * - `setAnalyticsEnabled(false)` is the consent kill-switch; call it from
 *   settings/opt-out before any `track()`.
 * - Never put PII in props (no tokens, emails, message bodies) — unenforced,
 *   review call sites when the vendor lands.
 */

import { logger } from "../observability/logger";
import { consoleDriver, noopDriver, type AnalyticsDriver, type AnalyticsProps } from "./drivers";
import type { AnalyticsEventName } from "./events";

declare const __DEV__: boolean;

const isDev = typeof __DEV__ !== "undefined" && __DEV__;

let driver: AnalyticsDriver = isDev ? consoleDriver : noopDriver;
let userId: string | null = null;
let enabled = true;

/** Swap the sink (vendor adapter). Future remote config calls this once at boot. */
export function setAnalyticsDriver(next: AnalyticsDriver): void {
  driver = next;
  if (userId) {
    try {
      driver.identify?.(userId);
    } catch {
      logger.warn("[analytics] driver identify failed", { driver: driver.name });
    }
  }
}

/** Consent kill-switch. Disabled hub drops every event silently. */
export function setAnalyticsEnabled(value: boolean): void {
  enabled = value;
}

/** Attach the current user. Call after login; `reset()` on logout. */
export function identify(user: string): void {
  userId = user;
  try {
    driver.identify?.(user);
  } catch {
    logger.warn("[analytics] identify failed", { driver: driver.name });
  }
}

/** Clear identity. Call on logout so the next user starts clean. */
export function resetAnalytics(): void {
  userId = null;
  try {
    driver.reset?.();
  } catch {
    logger.warn("[analytics] reset failed", { driver: driver.name });
  }
}

/** Fire a product event. Never throws — driver failures are logged, not raised. */
export function trackEvent(
  event: AnalyticsEventName | string,
  props: AnalyticsProps = {},
): void {
  if (!enabled) return;
  try {
    driver.track(event, userId ? { ...props, userId } : props);
  } catch {
    logger.warn("[analytics] track failed", { driver: driver.name, event });
  }
}

/** Test-only reset of hub state. Never call from product code. */
export function resetAnalyticsHubForTests(): void {
  driver = noopDriver;
  userId = null;
  enabled = true;
}

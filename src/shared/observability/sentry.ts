/**
 * Sentry client.
 *
 * - Uses `@sentry/react-native` instead of EAS Observe.
 * - DSN comes from `env.sentryDsn`; missing/empty means disabled ("would send").
 * - Never imports `logger` (one-way `logger -> sentry` avoids a cycle).
 * - Lazily requires the SDK so Jest/web without native modules stay disabled.
 */

import { appVariant, env } from "../config/env";

declare const __DEV__: boolean;

type SentryModule = typeof import("@sentry/react-native");

let sentry: SentryModule | null = null;
let initialized = false;
let enabled = false;

function loadSentry(): SentryModule | null {
  if (sentry !== null) return sentry;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("@sentry/react-native") as SentryModule;
    sentry = mod;
    return mod;
  } catch {
    return null;
  }
}

/** Test-only: resets module state between test cases. */
export function __resetObservabilityForTests(): void {
  initialized = false;
  enabled = false;
}

export type InitObservabilityOptions = {
  /** DSN override (tests or early bootstrap). Defaults to `env.sentryDsn`. */
  dsn?: string;
  /** Environment override. Defaults to `appVariant`. */
  environment?: string;
};

/**
 * Initializes Sentry once, early in app providers.
 * Never throws; returns disabled when the DSN or native SDK is missing.
 */
export function initObservability(options?: InitObservabilityOptions): { enabled: boolean } {
  if (initialized) return { enabled };
  initialized = true;

  const dsn = options?.dsn ?? env.sentryDsn;
  if (!dsn) {
    if (typeof __DEV__ !== "undefined" && __DEV__) {
      console.debug("[observability] Sentry disabled (no EXPO_PUBLIC_SENTRY_DSN) — events log 'would send' only.");
    }
    return { enabled: false };
  }

  const mod = loadSentry();
  if (mod === null) {
    if (typeof __DEV__ !== "undefined" && __DEV__) {
      console.debug("[observability] Sentry SDK unavailable — events log 'would send' only.");
    }
    return { enabled: false };
  }

  try {
    mod.init({
      dsn,
      enabled: true,
      environment: options?.environment ?? appVariant,
      // Crash reporting only; tracing stays off.
      tracesSampleRate: 0,
      // Never sends PII by default.
      sendDefaultPii: false,
    });
    enabled = true;
  } catch (error) {
    console.warn("[observability] Sentry.init failed, running disabled.", error);
    enabled = false;
  }
  return { enabled };
}

export function isObservabilityEnabled(): boolean {
  return enabled;
}

function toPlainContext(context: unknown): Record<string, unknown> | undefined {
  if (context === null || typeof context !== "object") return undefined;
  if (Array.isArray(context)) return { items: context };
  return context as Record<string, unknown>;
}

/**
 * Forwards errors from `logger.error`. Disabled logs "would send"; never throws.
 */
export function captureObservabilityError(message: string, context?: unknown): void {
  if (!enabled) {
    if (typeof __DEV__ !== "undefined" && __DEV__) {
      if (context === undefined) {
        console.debug("[observability:disabled] would send error:", message);
      } else {
        console.debug("[observability:disabled] would send error:", message, context);
      }
    }
    return;
  }
  const mod = loadSentry();
  if (mod === null) return;
  try {
    const error = new Error(message);
    const extra = toPlainContext(context);
    if (extra === undefined) {
      mod.captureException(error);
    } else {
      mod.captureException(error, { extra });
    }
  } catch {
    // Observability must never crash the app.
  }
}

/**
 * Captures a real `Error` with its stack (route `ErrorBoundary`s use this).
 * Disabled logs "would send"; never throws.
 */
export function captureError(error: Error, context?: unknown): void {
  if (!enabled) {
    if (typeof __DEV__ !== "undefined" && __DEV__) {
      console.debug("[observability:disabled] would send exception:", error.message, context);
    }
    return;
  }
  const mod = loadSentry();
  if (mod === null) return;
  try {
    const extra = toPlainContext(context);
    if (extra === undefined) {
      mod.captureException(error);
    } else {
      mod.captureException(error, { extra });
    }
  } catch {
    // Observability must never crash the app.
  }
}

/**
 * Attaches the stable user id after login; `null` clears it on logout.
 */
export function setObservabilityUser(userId: string | null): void {
  if (!enabled) return;
  const mod = loadSentry();
  if (mod === null) return;
  try {
    mod.setUser(userId === null ? null : { id: userId });
  } catch {
    // no-op
  }
}

/**
 * The mock session is an opaque token, never sent raw. Any session maps to `'dev-user'`.
 */
export function mapSessionToUserId(session: string | null): string | null {
  if (session === null) return null;
  return "dev-user";
}

/**
 * Per-screen navigation breadcrumb. Disabled is a silent no-op.
 */
export function addScreenBreadcrumb(screenName: string): void {
  if (!enabled) return;
  const mod = loadSentry();
  if (mod === null) return;
  try {
    mod.addBreadcrumb({ category: "navigation", level: "info", message: screenName });
  } catch {
    // no-op
  }
}

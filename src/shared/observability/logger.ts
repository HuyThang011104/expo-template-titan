/**
 * Shared logger.
 *
 * - `debug` only logs in `__DEV__`; `error` also forwards to Sentry.
 * - `extra` is redacted one level deep; raw tokens/passwords are never logged.
 * - One-way `logger -> sentry` dependency; `sentry.ts` never imports back.
 */

import { captureObservabilityError } from "./sentry";

declare const __DEV__: boolean;

export type LogLevel = "debug" | "info" | "warn" | "error";

const REDACTED = "[REDACTED]";

const SENSITIVE_PATTERN =
  /(token|password|secret|authorization|access_token|refresh_token)/i;

function redactShallow(value: object): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    out[key] = SENSITIVE_PATTERN.test(key) ? REDACTED : entry;
  }
  return out;
}

/** Shallow redact, no recursion — safe for circular objects. */
function redactExtra(extra: unknown): unknown {
  if (extra === null || typeof extra !== "object") return extra;
  if (Array.isArray(extra)) {
    return extra.map((item) =>
      item !== null && typeof item === "object" && !Array.isArray(item)
        ? redactShallow(item)
        : item,
    );
  }
  return redactShallow(extra);
}

function emit(level: LogLevel, message: string, extra?: unknown): void {
  const args = extra === undefined ? [message] : [message, redactExtra(extra)];
  switch (level) {
    case "debug":
      if (typeof __DEV__ !== "undefined" && __DEV__) console.debug(...args);
      break;
    case "info":
      console.log(...args);
      break;
    case "warn":
      console.warn(...args);
      break;
    case "error": {
      console.error(...args);
      // Forwards redacted extra to Sentry; never throws.
      try {
        captureObservabilityError(
          message,
          extra === undefined ? undefined : redactExtra(extra),
        );
      } catch {
        // no-op
      }
      break;
    }
  }
}

export const logger = {
  debug(message: string, extra?: unknown): void {
    emit("debug", message, extra);
  },
  info(message: string, extra?: unknown): void {
    emit("info", message, extra);
  },
  warn(message: string, extra?: unknown): void {
    emit("warn", message, extra);
  },
  error(message: string, extra?: unknown): void {
    emit("error", message, extra);
  },
};

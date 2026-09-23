/**
 * Feature flags — remote kill-switches, never branch-on-user-id.
 *
 * - Static per-variant defaults below; `overrides` is the future remote-payload slot
 *   (fetch it once at boot, pass it down — no per-screen fetching).
 * - Production enables only shipped surfaces; development enables everything.
 */

import { appVariant, type AppVariant } from "./env";

export const FEATURE_FLAGS = [
  "stories",
  "chat",
  "video-upload",
  "realtime-invalidation",
  "media-picker",
] as const;

export type FeatureFlagName = (typeof FEATURE_FLAGS)[number];

export type FeatureFlagMap = Record<FeatureFlagName, boolean>;

const DEFAULTS: Record<AppVariant, FeatureFlagMap> = {
  development: {
    stories: true,
    chat: true,
    "video-upload": true,
    "realtime-invalidation": true,
    "media-picker": true,
  },
  preview: {
    stories: false,
    chat: true,
    "video-upload": true,
    "realtime-invalidation": true,
    "media-picker": true,
  },
  production: {
    stories: false,
    chat: false,
    "video-upload": false,
    "realtime-invalidation": true,
    "media-picker": true,
  },
};

/** Merge static defaults with an optional remote override payload. */
export function resolveFeatureFlags(overrides: Partial<FeatureFlagMap> = {}): FeatureFlagMap {
  return { ...DEFAULTS[appVariant], ...overrides };
}

/** Single-flag read. Call sites use this, never `user.id === …`. */
export function isFeatureEnabled(
  name: FeatureFlagName,
  overrides: Partial<FeatureFlagMap> = {},
): boolean {
  return resolveFeatureFlags(overrides)[name];
}

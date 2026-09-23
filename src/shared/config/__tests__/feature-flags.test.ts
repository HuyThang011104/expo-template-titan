/**
 * Tests for `shared/config/feature-flags`. Jest runs as `development`.
 */

import { isFeatureEnabled, resolveFeatureFlags } from "../feature-flags";

describe("feature flags", () => {
  it("enables everything in development by default", () => {
    expect(resolveFeatureFlags()).toEqual({
      stories: true,
      chat: true,
      "video-upload": true,
      "realtime-invalidation": true,
      "media-picker": true,
    });
  });

  it("lets a remote payload override defaults", () => {
    expect(isFeatureEnabled("stories", { stories: false })).toBe(false);
    expect(isFeatureEnabled("stories")).toBe(true);
    expect(resolveFeatureFlags({ chat: false }).chat).toBe(false);
  });
});

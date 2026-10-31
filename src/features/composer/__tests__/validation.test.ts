/**
 * Tests for F1.1 composer validation (text-only UI messages) + P3 media rules.
 */

import type { PickedMedia } from "../../../shared/media";
import {
  COMPOSER_MAX_LENGTH,
  COMPOSER_MAX_VIDEO_BYTES,
  COMPOSER_MAX_VIDEO_DURATION_MS,
  validateComposerBody,
  validateComposerInput,
  validateComposerMedia,
  validateComposerVideo,
} from "../validation";

describe("validateComposerBody", () => {
  it("accepts 1–280 chars and trims", () => {
    const result = validateComposerBody("  hello feed  ");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.body).toBe("hello feed");
      expect(result.value.mediaIds).toEqual([]);
    }
  });

  it("rejects empty/whitespace with an inline message", () => {
    const result = validateComposerBody("   ");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.length).toBeGreaterThan(0);
  });

  it("rejects overlong bodies", () => {
    const result = validateComposerBody("x".repeat(COMPOSER_MAX_LENGTH + 1));
    expect(result.ok).toBe(false);
  });
});

describe("validateComposerInput", () => {
  it("rejects more than 4 media ids", () => {
    const result = validateComposerInput("ok", ["1", "2", "3", "4", "5"]);
    expect(result.ok).toBe(false);
  });
});

function image(uri: string): PickedMedia {
  return { uri, width: 100, height: 100, kind: "image", mimeType: "image/jpeg" };
}

function video(uri: string): PickedMedia {
  return { uri, width: 1280, height: 720, kind: "video", mimeType: "video/mp4" };
}

describe("validateComposerVideo", () => {
  it("accepts a 90s / 100MB video and rejects over the limits", () => {
    expect(
      validateComposerVideo({
        durationMs: COMPOSER_MAX_VIDEO_DURATION_MS,
        fileSize: COMPOSER_MAX_VIDEO_BYTES,
      }),
    ).toBeNull();
    expect(
      validateComposerVideo({
        durationMs: COMPOSER_MAX_VIDEO_DURATION_MS + 1,
        fileSize: null,
      }),
    ).toBe("Video must be 90 seconds or shorter.");
    expect(
      validateComposerVideo({
        durationMs: 1000,
        fileSize: COMPOSER_MAX_VIDEO_BYTES + 1,
      }),
    ).toBe("Video must be 100MB or smaller.");
  });
});

describe("validateComposerMedia", () => {
  it("accepts up to 4 photos or one video", () => {
    expect(validateComposerMedia([])).toBeNull();
    expect(validateComposerMedia([image("a"), image("b"), image("c"), image("d")])).toBeNull();
    expect(validateComposerMedia([video("v")])).toBeNull();
  });

  it("rejects mixed, too many photos, or more than one video", () => {
    expect(validateComposerMedia([image("a"), video("v")])).toContain("either one video");
    expect(
      validateComposerMedia([image("1"), image("2"), image("3"), image("4"), image("5")]),
    ).toContain("at most 4 photos");
    expect(validateComposerMedia([video("1"), video("2")])).toContain("at most one video");
  });
});

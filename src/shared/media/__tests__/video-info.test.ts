/**
 * Tests for `shared/media/video-info`. The native module is absent in Jest,
 * so these pin the picker-fallback contract (the path web/Expo Go always take).
 */

import { getLocalVideoMetadata } from "../video-info";

describe("getLocalVideoMetadata", () => {
  it("falls back to picker values when the native module is missing", async () => {
    await expect(
      getLocalVideoMetadata({
        uri: "file:///a.mp4",
        width: 1280,
        height: 720,
        kind: "video",
        mimeType: "video/mp4",
        fileSize: 1024,
        duration: 1500,
      }),
    ).resolves.toEqual({
      width: 1280,
      height: 720,
      durationMs: 1500,
      fileSize: 1024,
      source: "picker",
    });
  });

  it("normalizes missing picker numbers to zero/null", async () => {
    await expect(
      getLocalVideoMetadata({
        uri: "file:///b.mp4",
        width: 0,
        height: 0,
        kind: "video",
        mimeType: "video/mp4",
      }),
    ).resolves.toEqual({
      width: 0,
      height: 0,
      durationMs: 0,
      fileSize: null,
      source: "picker",
    });
  });
});

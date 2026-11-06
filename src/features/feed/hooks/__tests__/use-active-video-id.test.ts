/**
 * Tests for the single-active-video selector.
 *
 * - Two videos in view → first wins (never autoplay many).
 * - Scrolling to another video moves the active id.
 * - Images only → null.
 */

import { pickActiveVideoId, type FeedMediaKind } from "../use-active-video-id";

function kinds(entries: [string, FeedMediaKind][]): Map<string, FeedMediaKind> {
  return new Map(entries);
}

describe("pickActiveVideoId", () => {
  it("picks the first viewable video", () => {
    const active = pickActiveVideoId(
      ["feed-p-1", "feed-p-5", "feed-p-14"],
      kinds([
        ["feed-p-1", "image"],
        ["feed-p-5", "video"],
        ["feed-p-14", "video"],
      ]),
    );
    expect(active).toBe("feed-p-5");
  });

  it("moves when scrolling to another video", () => {
    const byId = kinds([
      ["feed-p-5", "video"],
      ["feed-p-14", "video"],
    ]);
    expect(pickActiveVideoId(["feed-p-14"], byId)).toBe("feed-p-14");
  });

  it("returns null when no video is viewable", () => {
    expect(
      pickActiveVideoId(["feed-p-1", "feed-p-2"], kinds([["feed-p-1", "image"]])),
    ).toBeNull();
    expect(pickActiveVideoId([], kinds([]))).toBeNull();
  });
});

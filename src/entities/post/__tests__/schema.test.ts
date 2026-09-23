/**
 * Tests for `entities/post/schema`.
 *
 * - Valid fixtures parse; bad `likeCount`, media kind,
 *   or missing `authorId` return `null`.
 */

import { mockPost1 } from "../__fixtures__";
import { parseFeedWireItem, parsePost } from "../schema";

describe("parsePost", () => {
  it("accepts a valid post fixture", () => {
    expect(parsePost(mockPost1)).toEqual(mockPost1);
  });

  it("returns null for negative likeCount (no throw)", () => {
    expect(parsePost({ ...mockPost1, likeCount: -1 })).toBeNull();
  });

  it("returns null for unknown media kind (no throw)", () => {
    expect(
      parsePost({ ...mockPost1, media: [{ kind: "audio", url: "https://example.com/a.mp3" }] }),
    ).toBeNull();
  });

  it("returns null when authorId is missing (no throw)", () => {
    const { authorId: _omitted, ...withoutAuthor } = mockPost1;
    expect(parsePost(withoutAuthor)).toBeNull();
  });

  it("returns null for non-array media", () => {
    expect(parsePost({ ...mockPost1, media: null })).toBeNull();
  });
});

describe("parseFeedWireItem", () => {
  // Inlined to respect the entity-to-entity boundary, even in tests.
  const author = {
    id: "u-1",
    handle: "ava",
    displayName: "Ava Stone",
    avatarUrl: "https://picsum.photos/seed/u1/200",
  };

  it("accepts a valid wire item", () => {
    expect(parseFeedWireItem({ post: mockPost1, author })).toEqual({
      post: mockPost1,
      author,
    });
  });

  it("returns null when author shape is invalid", () => {
    expect(parseFeedWireItem({ post: mockPost1, author: { id: "u-9" } })).toBeNull();
  });
});

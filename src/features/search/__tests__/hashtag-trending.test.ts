/**
 * Tests for G2.2 hashtag/trending parsing.
 *
 * - `normalizeHashtag` strips #/case/space.
 * - `parseHashtagPage` keeps G1 items compat + G2.2 tag/postCount.
 * - `parseTrendingPage` skips bad entries, never throws.
 */

import { normalizeHashtag, parseHashtagPage, parseTrendingPage } from "../schema";

const wireItem = {
  post: {
    id: "feed-p-3",
    authorId: "u-1",
    body: "Loving #travel lately!",
    media: [],
    likeCount: 1,
    likedByMe: false,
    createdAt: "2026-09-09T10:00:00.000Z",
  },
  author: { id: "u-1", handle: "ava", displayName: "Ava Stone", avatarUrl: null },
};

describe("normalizeHashtag", () => {
  it("strips leading hashes, trims, lowercases", () => {
    expect(normalizeHashtag("  ##Travel ")).toBe("travel");
    expect(normalizeHashtag("TECH")).toBe("tech");
    expect(normalizeHashtag("   ")).toBe("");
  });
});

describe("parseHashtagPage", () => {
  it("parses items + tag/postCount", () => {
    const parsed = parseHashtagPage({
      items: [wireItem, { post: null, author: null }],
      nextCursor: null,
      tag: "Travel",
      postCount: 3,
    });
    expect(parsed?.items).toHaveLength(1);
    expect(parsed?.tag).toBe("travel");
    expect(parsed?.postCount).toBe(3);
  });

  it("stays G1-compatible when tag/postCount are missing", () => {
    const parsed = parseHashtagPage({ items: [wireItem], nextCursor: "10" });
    expect(parsed?.items).toHaveLength(1);
    expect(parsed?.tag).toBeNull();
    expect(parsed?.postCount).toBeNull();
  });

  it("returns null for a bad shape", () => {
    expect(parseHashtagPage(null)).toBeNull();
    expect(parseHashtagPage({ items: "nope" })).toBeNull();
  });
});

describe("parseTrendingPage", () => {
  it("parses tags + users, skipping bad entries", () => {
    const parsed = parseTrendingPage({
      tags: [
        { tag: "tech", postCount: 4, updatedAt: "2026-09-09T10:00:00.000Z" },
        { tag: "", postCount: -1, updatedAt: "x" },
      ],
      users: [
        { id: "u-2", handle: "liam", displayName: "Liam Carter", avatarUrl: null },
        { id: "bad", handle: "", displayName: "", avatarUrl: null },
      ],
    });
    expect(parsed?.tags).toHaveLength(1);
    expect(parsed?.tags[0]).toMatchObject({ tag: "tech", postCount: 4 });
    expect(parsed?.users).toHaveLength(1);
  });

  it("returns null for a bad shape", () => {
    expect(parseTrendingPage(null)).toBeNull();
    expect(parseTrendingPage({ tags: [] })).toBeNull();
  });
});

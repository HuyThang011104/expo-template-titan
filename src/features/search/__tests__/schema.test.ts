/**
 * Tests for F3 search response parsing.
 */

import { parseSearchPage } from "../schema";

describe("parseSearchPage", () => {
  it("parses users + wire items and normalizes nextCursor", () => {
    const parsed = parseSearchPage({
      users: [
        { id: "u-1", handle: "ava", displayName: "Ava Stone", avatarUrl: null },
        { id: "bad", handle: "", displayName: "", avatarUrl: null },
      ],
      items: [
        {
          post: {
            id: "p-1",
            authorId: "u-1",
            body: "hello",
            media: [],
            likeCount: 1,
            likedByMe: false,
            createdAt: "2026-09-09T10:00:00.000Z",
          },
          author: { id: "u-1", handle: "ava", displayName: "Ava Stone", avatarUrl: null },
        },
        { post: null, author: null },
      ],
      nextCursor: "10",
    });

    expect(parsed?.users).toHaveLength(1);
    expect(parsed?.items).toHaveLength(1);
    expect(parsed?.nextCursor).toBe("10");
  });

  it("returns null for a bad page shape", () => {
    expect(parseSearchPage(null)).toBeNull();
    expect(parseSearchPage({ users: [], nextCursor: null })).toBeNull();
  });
});

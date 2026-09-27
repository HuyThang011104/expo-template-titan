/**
 * Tests for F1.0 create-post: input schema, `createPostRemote` mock,
 * and `addCreatedPost` canonical prepend (no full invalidate).
 */

import type { InfiniteData } from "@tanstack/react-query";

import { createMockFetch } from "../../../shared/api/mock-handlers";
import { createQueryClient } from "../../../shared/query/query-client";
import { queryKeys } from "../../../shared/query/query-keys";
import { mockPost1 } from "../__fixtures__";
import { createPostRemote } from "../api";
import { addCreatedPost, getPostData } from "../cache";
import type { Post } from "../model";
import { parseCreatePostInput } from "../schema";

type FeedPage = { postIds: string[]; nextCursor: string | null };

function seedFeed(qc: ReturnType<typeof createQueryClient>, postIds: string[]): void {
  qc.setQueryData<InfiniteData<FeedPage, string | null>>(queryKeys.homeFeed(), {
    pages: [{ postIds, nextCursor: null }],
    pageParams: [null],
  });
}

function readFeedIds(qc: ReturnType<typeof createQueryClient>): string[] {
  const data = qc.getQueryData<InfiniteData<FeedPage, string | null>>(queryKeys.homeFeed());
  return (data?.pages ?? []).flatMap((page) => page.postIds);
}

describe("parseCreatePostInput", () => {
  it("accepts text + media ids with trimming", () => {
    expect(parseCreatePostInput({ body: "  hello  ", mediaIds: ["m1"] })).toEqual({
      body: "hello",
      mediaIds: ["m1"],
    });
  });

  it("rejects empty body, overlong body, and >4 media (no throw)", () => {
    expect(parseCreatePostInput({ body: "   ", mediaIds: [] })).toBeNull();
    expect(parseCreatePostInput({ body: "x".repeat(281), mediaIds: [] })).toBeNull();
    expect(parseCreatePostInput({ body: "ok", mediaIds: ["1", "2", "3", "4", "5"] })).toBeNull();
  });
});

describe("createPostRemote (mock)", () => {
  it("creates a post via POST /posts", async () => {
    const post = await createPostRemote("hello feed", [], {
      fetchImpl: createMockFetch({ delayMs: 0 }),
    });
    expect(post).not.toBeNull();
    expect(post?.body).toBe("hello feed");
    expect(post?.likeCount).toBe(0);
    expect(post?.likedByMe).toBe(false);
  });

  it("throws on invalid input (mock 400)", async () => {
    await expect(
      createPostRemote("", [], { fetchImpl: createMockFetch({ delayMs: 0 }) }),
    ).rejects.toThrow();
  });
});

describe("addCreatedPost", () => {
  const newPost: Post = {
    ...mockPost1,
    id: "p-new-1",
    body: "fresh post",
    likeCount: 0,
    likedByMe: false,
  };

  it("writes canonical + prepends page 0", () => {
    const qc = createQueryClient();
    seedFeed(qc, ["p-1", "p-2"]);

    addCreatedPost(qc, newPost);

    expect(getPostData(qc, "p-new-1")).toEqual(newPost);
    expect(readFeedIds(qc)).toEqual(["p-new-1", "p-1", "p-2"]);
  });

  it("dedupes when the id is already first", () => {
    const qc = createQueryClient();
    seedFeed(qc, ["p-new-1", "p-1"]);

    addCreatedPost(qc, newPost);
    addCreatedPost(qc, newPost);

    expect(readFeedIds(qc)).toEqual(["p-new-1", "p-1"]);
  });

  it("creates page 0 when the feed was never fetched", () => {
    const qc = createQueryClient();

    addCreatedPost(qc, newPost);

    expect(getPostData(qc, "p-new-1")).toEqual(newPost);
    expect(readFeedIds(qc)).toEqual(["p-new-1"]);
  });
});

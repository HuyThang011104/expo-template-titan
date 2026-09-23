/**
 * Tests for `entities/post/cache` — canonical entries plus optimistic like.
 *
 * - One clean `QueryClient` per test with an injected `likeRemote`.
 * - Author assertions use the shared `queryKeys.user`.
 */

import { createQueryClient } from "../../../shared/query/query-client";
import { queryKeys } from "../../../shared/query/query-keys";
import { mockFailPost, mockPost1, mockPost2 } from "../__fixtures__";
import {
  getPostData,
  hydrateFeedItem,
  likePost,
  patchPost,
  setPost,
  type LikeRemoteFn,
} from "../cache";
import type { Post } from "../model";

function likedServer(post: Post): Post {
  return {
    ...post,
    likedByMe: !post.likedByMe,
    likeCount: Math.max(0, post.likeCount + (post.likedByMe ? -1 : 1)),
  };
}

const successRemote: LikeRemoteFn = async (id, liked) => {
  const seed = [mockPost1, mockPost2, mockFailPost].find((post) => post.id === id);
  if (!seed) return null;
  return { ...seed, likedByMe: liked, likeCount: Math.max(0, seed.likeCount + (liked ? 1 : -1)) };
};

const throwRemote: LikeRemoteFn = async () => {
  throw new Error("boom");
};

const nullRemote: LikeRemoteFn = async () => null;

describe("hydrateFeedItem", () => {
  it("writes post + author canonical", () => {
    const qc = createQueryClient();
    const author = {
      id: "u-1",
      handle: "ava",
      displayName: "Ava Stone",
      avatarUrl: "https://picsum.photos/seed/u1/200",
    };

    const result = hydrateFeedItem(qc, { post: mockPost1, author });

    expect(result).toEqual({ postId: "p-1" });
    expect(getPostData(qc, "p-1")).toEqual(mockPost1);
    expect(qc.getQueryData(queryKeys.user("u-1"))).toEqual(author);
  });
});

describe("likePost", () => {
  it("flips likedByMe and adjusts count, visible from any reader of the canonical", async () => {
    const qc = createQueryClient();
    setPost(qc, mockPost1);
    // Two fake feeds point at one postId and share the canonical entry.
    const feedA = ["p-1"];
    const feedB = ["p-1"];

    await likePost(qc, "p-1", { likeRemote: successRemote });

    for (const feed of [feedA, feedB]) {
      const post = getPostData(qc, feed[0] as string);
      expect(post?.likedByMe).toBe(true);
      expect(post?.likeCount).toBe(mockPost1.likeCount + 1);
    }
  });

  it("server response wins over the optimistic value", async () => {
    const qc = createQueryClient();
    setPost(qc, mockPost1);

    await likePost(qc, "p-1", {
      likeRemote: async () => likedServer({ ...mockPost1, likeCount: 999, likedByMe: false }),
    });

    expect(getPostData(qc, "p-1")?.likeCount).toBe(1000);
  });

  it("rolls back when remote throws", async () => {
    const qc = createQueryClient();
    setPost(qc, mockPost1);

    await likePost(qc, "p-1", { likeRemote: throwRemote });

    expect(getPostData(qc, "p-1")).toEqual(mockPost1);
  });

  it("rolls back when remote returns null (parse fail)", async () => {
    const qc = createQueryClient();
    setPost(qc, mockPost2);

    await likePost(qc, "p-2", { likeRemote: nullRemote });

    expect(getPostData(qc, "p-2")).toEqual(mockPost2);
  });

  it("is a no-op for unknown ids (no ghost entries)", async () => {
    const qc = createQueryClient();

    await likePost(qc, "nope", { likeRemote: successRemote });

    expect(getPostData(qc, "nope")).toBeUndefined();
  });
});

describe("patchPost", () => {
  it("returns undefined without creating ghosts for unknown ids", () => {
    const qc = createQueryClient();

    expect(patchPost(qc, "nope", { likedByMe: true })).toBeUndefined();
    expect(getPostData(qc, "nope")).toBeUndefined();
  });
});

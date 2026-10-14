/**
 * Tests for G1.3 edit/delete cache (entity level, mock-backed).
 *
 * - Update overwrites the single canonical entry (feed/detail/profile follow).
 * - Validation throws before any network call.
 * - Non-owner (403) and unknown (404) throw with local state untouched.
 * - Delete strips the id from home feed + profile + search lists and drops
 *   the canonical entry; non-owner delete throws with lists untouched.
 *
 * NOTE: the mock holds module-level post bodies + a deleted set, so mutated
 * ids (`p-1`, `feed-p-16`) are used by nothing else in this file.
 */

import { createMockFetch } from "../../../shared/api/mock-handlers";
import { createQueryClient } from "../../../shared/query/query-client";
import { queryKeys } from "../../../shared/query/query-keys";
import { deletePostRemote, updatePostRemote } from "../api";
import { deletePost, getPostData, removePostEverywhere, updatePost } from "../cache";

function remoteFor(fetchImpl: typeof fetch) {
  return {
    update: (id: string, body: string) => updatePostRemote(id, body, { fetchImpl }),
    remove: (id: string) => deletePostRemote(id, { fetchImpl }),
  };
}

describe("updatePost", () => {
  it("overwrites the canonical body, keeping id/author/media", async () => {
    const qc = createQueryClient();
    const fetchImpl = createMockFetch({ delayMs: 0 });
    const remote = remoteFor(fetchImpl);

    const updated = await updatePost(qc, "p-1", "Edited body.", {
      updateRemote: remote.update,
    });

    expect(updated.id).toBe("p-1");
    expect(updated.body).toBe("Edited body.");
    expect(updated.authorId).toBe("u-1");
    expect(getPostData(qc, "p-1")?.body).toBe("Edited body.");
  });

  it("throws on empty/overlong input without calling the server", async () => {
    const qc = createQueryClient();
    let calls = 0;
    const counting = async (id: string, body: string) => {
      calls += 1;
      return updatePostRemote(id, body, { fetchImpl: createMockFetch({ delayMs: 0 }) });
    };

    await expect(updatePost(qc, "p-1", "   ", { updateRemote: counting })).rejects.toThrow();
    await expect(
      updatePost(qc, "p-1", "x".repeat(281), { updateRemote: counting }),
    ).rejects.toThrow();
    expect(calls).toBe(0);
  });

  it("throws for non-owners (403) with local state untouched", async () => {
    const qc = createQueryClient();
    const fetchImpl = createMockFetch({ delayMs: 0 });
    const remote = remoteFor(fetchImpl);

    // feed-p-1 belongs to u-2; the mock viewer is u-1.
    await expect(
      updatePost(qc, "feed-p-1", "Hijacked.", { updateRemote: remote.update }),
    ).rejects.toThrow();
    expect(getPostData(qc, "feed-p-1")).toBeUndefined();
  });

  it("throws for unknown posts (404)", async () => {
    const qc = createQueryClient();
    const fetchImpl = createMockFetch({ delayMs: 0 });
    const remote = remoteFor(fetchImpl);

    await expect(
      updatePost(qc, "ghost", "Hello?", { updateRemote: remote.update }),
    ).rejects.toThrow();
  });
});

describe("deletePost", () => {
  it("strips the id from every loaded list and drops the canonical entry", async () => {
    const qc = createQueryClient();
    const fetchImpl = createMockFetch({ delayMs: 0 });
    const remote = remoteFor(fetchImpl);

    // feed-p-16 belongs to u-1 (16 % 8 === 0).
    qc.setQueryData(queryKeys.homeFeed(), {
      pages: [{ postIds: ["feed-p-16", "feed-p-1"], nextCursor: null }],
      pageParams: [null],
    });
    qc.setQueryData(queryKeys.userPosts("u-1"), {
      pages: [{ postIds: ["feed-p-16"], nextCursor: null }],
      pageParams: [null],
    });
    qc.setQueryData(queryKeys.search("feed"), {
      pages: [{ userIds: [], postIds: ["feed-p-1", "feed-p-16"], nextCursor: null }],
      pageParams: [null],
    });

    await deletePost(qc, "feed-p-16", { deleteRemote: remote.remove });

    expect(getPostData(qc, "feed-p-16")).toBeUndefined();
    expect(
      qc.getQueryData<{ pages: { postIds: string[] }[] }>(queryKeys.homeFeed())?.pages[0]
        ?.postIds,
    ).toEqual(["feed-p-1"]);
    expect(
      qc.getQueryData<{ pages: { postIds: string[] }[] }>(queryKeys.userPosts("u-1"))?.pages[0]
        ?.postIds,
    ).toEqual([]);
    expect(
      qc.getQueryData<{ pages: { postIds: string[] }[] }>(queryKeys.search("feed"))?.pages[0]
        ?.postIds,
    ).toEqual(["feed-p-1"]);
  });

  it("throws for non-owners with lists untouched", async () => {
    const qc = createQueryClient();
    const fetchImpl = createMockFetch({ delayMs: 0 });
    const remote = remoteFor(fetchImpl);

    qc.setQueryData(queryKeys.homeFeed(), {
      pages: [{ postIds: ["feed-p-1"], nextCursor: null }],
      pageParams: [null],
    });

    await expect(deletePost(qc, "feed-p-1", { deleteRemote: remote.remove })).rejects.toThrow();
    expect(
      qc.getQueryData<{ pages: { postIds: string[] }[] }>(queryKeys.homeFeed())?.pages[0]
        ?.postIds,
    ).toEqual(["feed-p-1"]);
  });
});

describe("removePostEverywhere", () => {
  it("leaves other ids and non-post lists alone", async () => {
    const qc = createQueryClient();
    qc.setQueryData(queryKeys.homeFeed(), {
      pages: [
        { postIds: ["a", "b"], nextCursor: "10" },
        { postIds: ["c"], nextCursor: null },
      ],
      pageParams: [null, "10"],
    });

    removePostEverywhere(qc, "b");

    expect(
      qc.getQueryData<{ pages: { postIds: string[] }[] }>(queryKeys.homeFeed())?.pages,
    ).toEqual([
      { postIds: ["a"], nextCursor: "10" },
      { postIds: ["c"], nextCursor: null },
    ]);
  });
});

/**
 * Tests for the G1.2 comment cache: create (prepend top-level head,
 * append reply to its group), like flip + rollback, validation throws,
 * pagination shape, and thread ordering.
 *
 * NOTE: the mock backend holds a module-level comment store, so creates in
 * this file target `p-2` (no seeds) and reply tests use their own parent.
 */

import { createMockFetch } from "../../../shared/api/mock-handlers";
import { createQueryClient } from "../../../shared/query/query-client";
import {
  createCommentRemote,
  fetchPostCommentsRemote,
  likeCommentRemote,
} from "../api";
import { parseCommentWireItem } from "../schema";
import {
  addComment,
  createComment,
  getCommentData,
  hydrateCommentItem,
  likeComment,
} from "../cache";
import { buildCommentThread } from "../thread";

function remoteFor(fetchImpl: typeof fetch) {
  return {
    create: (postId: string, body: string, parentId: string | null) =>
      createCommentRemote(postId, body, parentId, { fetchImpl }),
    like: (id: string, liked: boolean) => likeCommentRemote(id, liked, { fetchImpl }),
  };
}

describe("comment pagination", () => {
  it("returns 10 top-level + inline replies on page 1, then the rest", async () => {
    const fetchImpl = createMockFetch({ delayMs: 0 });

    const first = await fetchPostCommentsRemote("feed-p-1", null, { fetchImpl });
    // 10 tops; c-p1-01 carries 3 replies, c-p1-02 carries 1.
    expect(first?.items).toHaveLength(14);
    expect(first?.nextCursor).toBe("10");

    const second = await fetchPostCommentsRemote("feed-p-1", "10", { fetchImpl });
    expect(second?.items).toHaveLength(2);
    expect(second?.nextCursor).toBeNull();
  });

  it("skips bad wire items without throwing", () => {
    expect(parseCommentWireItem({ nope: true })).toBeNull();
  });
});

describe("createComment", () => {
  it("prepends a new top-level comment to page-0 head", async () => {
    const qc = createQueryClient();
    const fetchImpl = createMockFetch({ delayMs: 0 });
    const remote = remoteFor(fetchImpl);

    const created = await createComment(qc, "p-2", "Hello from the test.", null, {
      createRemote: remote.create,
    });

    expect(created.body).toBe("Hello from the test.");
    expect(getCommentData(qc, created.id)?.body).toBe("Hello from the test.");
    const page = qc.getQueryData<{ pages: { commentIds: string[] }[] }>([
      "posts",
      "p-2",
      "comments",
    ]);
    expect(page?.pages[0]?.commentIds[0]).toBe(created.id);
  });

  it("appends a reply after its parent group", async () => {
    const qc = createQueryClient();
    const fetchImpl = createMockFetch({ delayMs: 0 });
    const remote = remoteFor(fetchImpl);

    // Seed page 0 from the server, then reply to the first top-level.
    const page = await fetchPostCommentsRemote("feed-p-1", null, { fetchImpl });
    const ids: string[] = [];
    for (const item of page?.items ?? []) ids.push(hydrateCommentItem(qc, item).commentId);
    qc.setQueryData(["posts", "feed-p-1", "comments"], {
      pages: [{ commentIds: ids, nextCursor: "10" }],
      pageParams: [null],
    });

    const parentId = "c-p1-02";
    const reply = await createComment(qc, "feed-p-1", "A fresh reply.", parentId, {
      createRemote: remote.create,
    });

    const stored = qc.getQueryData<{ pages: { commentIds: string[] }[] }>([
      "posts",
      "feed-p-1",
      "comments",
    ]);
    const flat = (stored?.pages ?? []).flatMap((entry) => entry.commentIds);
    expect(flat.indexOf(reply.id)).toBeGreaterThan(flat.indexOf(parentId));
    // Right after the existing reply c-p1-r4.
    expect(flat[flat.indexOf(parentId) + 1]).toBe("c-p1-r4");
    expect(flat[flat.indexOf(parentId) + 2]).toBe(reply.id);
  });

  it("throws on empty/overlong input without calling the server", async () => {
    const qc = createQueryClient();
    let calls = 0;
    const counting = async (...args: Parameters<typeof createCommentRemote>) => {
      calls += 1;
      return createCommentRemote(...args);
    };

    await expect(createComment(qc, "p-2", "   ", null, { createRemote: counting })).rejects.toThrow();
    await expect(
      createComment(qc, "p-2", "x".repeat(501), null, { createRemote: counting }),
    ).rejects.toThrow();
    await expect(
      createComment(qc, "p-2", "ok", "ghost-parent", { createRemote: counting }),
    ).rejects.toThrow();
    expect(calls).toBe(0);
  });
});

describe("likeComment", () => {
  it("flips count optimistically and keeps the server value", async () => {
    const qc = createQueryClient();
    const fetchImpl = createMockFetch({ delayMs: 0 });
    const remote = remoteFor(fetchImpl);

    const page = await fetchPostCommentsRemote("feed-p-1", null, { fetchImpl });
    for (const item of page?.items ?? []) hydrateCommentItem(qc, item);

    const before = getCommentData(qc, "c-p1-02");
    if (!before) throw new Error("setup failed: missing c-p1-02");

    await likeComment(qc, "c-p1-02", { likeRemote: remote.like });

    const after = getCommentData(qc, "c-p1-02");
    expect(after?.likedByMe).toBe(!before.likedByMe);
    expect(after?.likeCount).toBe(before.likeCount + (!before.likedByMe ? 1 : -1));
  });

  it("rolls back the forced-failure comment", async () => {
    const qc = createQueryClient();
    const fetchImpl = createMockFetch({ delayMs: 0 });
    const remote = remoteFor(fetchImpl);

    const page = await fetchPostCommentsRemote("feed-p-1", null, { fetchImpl });
    for (const item of page?.items ?? []) hydrateCommentItem(qc, item);

    const before = getCommentData(qc, "c-fail");
    if (!before) throw new Error("setup failed: missing c-fail");

    await likeComment(qc, "c-fail", { likeRemote: remote.like });

    expect(getCommentData(qc, "c-fail")).toEqual(before);
  });
});

describe("buildCommentThread", () => {
  it("orders tops newest-first with replies oldest-first when expanded", () => {
    const rows = buildCommentThread(
      [
        {
          id: "t-old",
          postId: "p",
          authorId: "u-1",
          body: "old",
          parentId: null,
          likeCount: 0,
          likedByMe: false,
          createdAt: "2026-09-09T08:00:00.000Z",
        },
        {
          id: "t-new",
          postId: "p",
          authorId: "u-1",
          body: "new",
          parentId: null,
          likeCount: 0,
          likedByMe: false,
          createdAt: "2026-09-09T10:00:00.000Z",
        },
        {
          id: "r-late",
          postId: "p",
          authorId: "u-2",
          body: "late",
          parentId: "t-new",
          likeCount: 0,
          likedByMe: false,
          createdAt: "2026-09-09T11:00:00.000Z",
        },
        {
          id: "r-early",
          postId: "p",
          authorId: "u-2",
          body: "early",
          parentId: "t-new",
          likeCount: 0,
          likedByMe: false,
          createdAt: "2026-09-09T10:30:00.000Z",
        },
      ],
      { expandedIds: new Set(["t-new"]) },
    );

    expect(rows.map((row) => [row.comment.id, row.depth])).toEqual([
      ["t-new", 0],
      ["r-early", 1],
      ["r-late", 1],
      ["t-old", 0],
    ]);
  });

  it("collapses replies by default and reports replyCount", () => {
    const rows = buildCommentThread([
      {
        id: "t-1",
        postId: "p",
        authorId: "u-1",
        body: "top",
        parentId: null,
        likeCount: 0,
        likedByMe: false,
        createdAt: "2026-09-09T10:00:00.000Z",
      },
      {
        id: "r-1",
        postId: "p",
        authorId: "u-2",
        body: "reply",
        parentId: "t-1",
        likeCount: 0,
        likedByMe: false,
        createdAt: "2026-09-09T10:30:00.000Z",
      },
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      comment: { id: "t-1" },
      depth: 0,
      replyCount: 1,
      repliesExpanded: false,
    });
  });

  it("keeps orphan replies visible as top-level", () => {
    const rows = buildCommentThread([
      {
        id: "r-orphan",
        postId: "p",
        authorId: "u-2",
        body: "orphan",
        parentId: "ghost",
        likeCount: 0,
        likedByMe: false,
        createdAt: "2026-09-09T10:00:00.000Z",
      },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.depth).toBe(0);
  });
});

describe("addComment", () => {
  it("creates page 0 when the list was never fetched", async () => {
    const qc = createQueryClient();
    addComment(qc, "p-2", {
      id: "c-local",
      postId: "p-2",
      authorId: "u-1",
      body: "local",
      parentId: null,
      likeCount: 0,
      likedByMe: false,
      createdAt: new Date().toISOString(),
    });
    const page = qc.getQueryData<{ pages: { commentIds: string[] }[] }>([
      "posts",
      "p-2",
      "comments",
    ]);
    expect(page?.pages[0]?.commentIds).toEqual(["c-local"]);
  });
});

/**
 * Tests for the G1.4 saved cache (entity level, mock-backed).
 *
 * - The seeded list contains `feed-p-2`.
 * - Save inserts immediately (optimistic) and survives refetch (mock persist).
 * - Unsave strips immediately.
 * - Unknown ids throw after rollback with pages untouched.
 *
 * NOTE: the mock holds a module-level saved set, so mutated ids are used by
 * nothing else in this file.
 */

import { createMockFetch } from "../../../shared/api/mock-handlers";
import { createQueryClient } from "../../../shared/query/query-client";
import { queryKeys } from "../../../shared/query/query-keys";
import {
  fetchSavedPostsRemote,
  savePostRemote,
  unsavePostRemote,
} from "../api";
import { getSavedIds, hydrateSavedItem, isSaved, setSaved } from "../cache";

function remoteFor(fetchImpl: typeof fetch) {
  return {
    save: (id: string) => savePostRemote(id, { fetchImpl }),
    unsave: (id: string) => unsavePostRemote(id, { fetchImpl }),
  };
}

async function seedList(
  qc: ReturnType<typeof createQueryClient>,
  fetchImpl: typeof fetch,
): Promise<void> {
  const page = await fetchSavedPostsRemote(null, { fetchImpl });
  const ids: string[] = [];
  for (const item of page?.items ?? []) ids.push(hydrateSavedItem(qc, item).postId);
  qc.setQueryData(queryKeys.savedPosts(), {
    pages: [{ postIds: ids, nextCursor: null }],
    pageParams: [null],
  });
}

describe("saved list", () => {
  it("returns the seeded post with its author hydrated", async () => {
    const qc = createQueryClient();
    const fetchImpl = createMockFetch({ delayMs: 0 });

    const page = await fetchSavedPostsRemote(null, { fetchImpl });
    expect(page?.items.map((item) => item.post.id)).toContain("feed-p-2");
    expect(page?.nextCursor).toBeNull();

    for (const item of page?.items ?? []) hydrateSavedItem(qc, item);
    expect(qc.getQueryData(queryKeys.post("feed-p-2"))).toBeDefined();
  });

  it("save inserts immediately and survives refetch", async () => {
    const qc = createQueryClient();
    const fetchImpl = createMockFetch({ delayMs: 0 });
    const remote = remoteFor(fetchImpl);
    await seedList(qc, fetchImpl);

    await setSaved(qc, "feed-p-1", true, {
      saveRemote: remote.save,
      unsaveRemote: remote.unsave,
    });

    expect(isSaved(qc, "feed-p-1")).toBe(true);
    expect(getSavedIds(qc)[0]).toBe("feed-p-1");

    const refetched = await fetchSavedPostsRemote(null, { fetchImpl });
    expect(refetched?.items.map((item) => item.post.id)).toContain("feed-p-1");
  });

  it("unsave strips immediately", async () => {
    const qc = createQueryClient();
    const fetchImpl = createMockFetch({ delayMs: 0 });
    const remote = remoteFor(fetchImpl);
    await seedList(qc, fetchImpl);
    expect(isSaved(qc, "feed-p-2")).toBe(true);

    await setSaved(qc, "feed-p-2", false, {
      saveRemote: remote.save,
      unsaveRemote: remote.unsave,
    });

    expect(isSaved(qc, "feed-p-2")).toBe(false);
  });

  it("throws and rolls back for unknown posts", async () => {
    const qc = createQueryClient();
    const fetchImpl = createMockFetch({ delayMs: 0 });
    const remote = remoteFor(fetchImpl);
    await seedList(qc, fetchImpl);
    const before = getSavedIds(qc);

    await expect(
      setSaved(qc, "ghost", true, { saveRemote: remote.save, unsaveRemote: remote.unsave }),
    ).rejects.toThrow();
    expect(getSavedIds(qc)).toEqual(before);

    await expect(
      setSaved(qc, "ghost", false, { saveRemote: remote.save, unsaveRemote: remote.unsave }),
    ).rejects.toThrow();
  });
});

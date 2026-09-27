/**
 * Tests for `fetchUserPostsRemote` + `useUserPosts`.
 *
 * - Filters the deterministic mock feed by `authorId`.
 * - Hydrates canonical `PostCard` entries (like works cross-cache).
 * - Unknown users return an empty list, never a crash.
 */

import { act, renderHook, waitFor } from "@testing-library/react-native";
import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { getPostData, likePost } from "../cache";
import { fetchUserPostsRemote, likePostRemote } from "../api";
import { useUserPosts } from "../queries";
import { createMockFetch } from "../../../shared/api/mock-handlers";
import { createQueryClient } from "../../../shared/query/query-client";
import { queryKeys } from "../../../shared/query/query-keys";

jest.mock("../../../shared/storage/secure", () => ({
  getSecureItem: jest.fn(async () => null),
  setSecureItem: jest.fn(async () => {}),
  deleteSecureItem: jest.fn(async () => {}),
}));

jest.mock("expo-splash-screen", () => ({
  hideAsync: jest.fn(async () => {}),
  preventAutoHideAsync: jest.fn(async () => {}),
}));

function setup() {
  const qc = createQueryClient();
  const fetchImpl = createMockFetch({ delayMs: 0 });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return { qc, fetchImpl, wrapper };
}

describe("fetchUserPostsRemote", () => {
  it("returns only that author's posts with authors attached", async () => {
    const { fetchImpl } = setup();
    const page = await fetchUserPostsRemote("u-1", null, { fetchImpl });
    expect(page).not.toBeNull();
    expect(page?.items.length).toBeGreaterThan(0);
    for (const item of page?.items ?? []) {
      expect(item.post.authorId).toBe("u-1");
      expect(item.author.id).toBe("u-1");
    }
    expect(page?.nextCursor).toBeNull();
  });

  it("returns an empty list for unknown users", async () => {
    const { fetchImpl } = setup();
    const page = await fetchUserPostsRemote("ghost", null, { fetchImpl });
    expect(page?.items).toEqual([]);
    expect(page?.nextCursor).toBeNull();
  });
});

describe("useUserPosts", () => {
  it("hydrates canonical posts + authors for the profile list", async () => {
    const { qc, fetchImpl, wrapper } = setup();
    const { result } = await renderHook(() => useUserPosts("u-1", { fetchImpl }), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.postIds.length).toBeGreaterThan(0);
    const firstId = result.current.postIds[0] ?? "";
    expect(getPostData(qc, firstId)?.authorId).toBe("u-1");
    expect(qc.getQueryData(queryKeys.user("u-1"))).toBeDefined();
  });

  it("prefetchPost warms a post outside the user's own list", async () => {
    const { qc, fetchImpl, wrapper } = setup();
    const { result } = await renderHook(() => useUserPosts("u-1", { fetchImpl }), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    result.current.prefetchPost("p-2");
    await waitFor(() => {
      expect(getPostData(qc, "p-2")?.id).toBe("p-2");
    });
  });

  it("like on a profile post flips the same canonical entry the feed reads", async () => {
    const { qc, fetchImpl, wrapper } = setup();
    const { result } = await renderHook(() => useUserPosts("u-1", { fetchImpl }), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // `post-fail` always rolls back by design — like a real post instead.
    const firstId = result.current.postIds.find((id) => id !== "post-fail") ?? "";
    expect(firstId).not.toBe("");
    const before = getPostData(qc, firstId);
    if (!before) throw new Error("setup failed: missing canonical post");

    await act(async () => {
      await likePost(qc, firstId, {
        likeRemote: (id, liked) => likePostRemote(id, liked, { fetchImpl }),
      });
    });

    const after = getPostData(qc, firstId);
    expect(after?.likedByMe).toBe(!before.likedByMe);
  });
});

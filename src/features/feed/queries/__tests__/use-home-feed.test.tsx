/**
 * Tests for the feed hydrator plus pagination.
 *
 * - One clean `QueryClient` per test with zero-delay mock fetch.
 * - Covers hydration, cursor pagination, like, rollback, and prefetch.
 */

import { act, renderHook, waitFor } from "@testing-library/react-native";
import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { getPostData, likePost, likePostRemote } from "../../../../entities/post";
import { createMockFetch } from "../../../../shared/api/mock-handlers";
import { createQueryClient } from "../../../../shared/query/query-client";
import { queryKeys } from "../../../../shared/query/query-keys";
import { useHomeFeed } from "../use-home-feed";

jest.mock("../../../../shared/storage/secure", () => ({
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
  const likeRemote = (id: string, liked: boolean) => likePostRemote(id, liked, { fetchImpl });
  return { qc, fetchImpl, wrapper, likeRemote };
}

describe("useHomeFeed", () => {
  it("hydrates the first page into canonical post + author cache", async () => {
    const { qc, fetchImpl, wrapper } = setup();
    const { result } = await renderHook(() => useHomeFeed({ fetchImpl }), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const ids = result.current.postIds;
    expect(ids).toHaveLength(10);

    const firstId = ids[0] ?? "";
    const post = getPostData(qc, firstId);
    expect(post?.id).toBe(firstId);
    expect(qc.getQueryData(queryKeys.user(post?.authorId ?? ""))).toBeDefined();
  });

  it("paginates cursor pages to 40 unique items then ends", async () => {
    const { fetchImpl, wrapper } = setup();
    const { result } = await renderHook(() => useHomeFeed({ fetchImpl }), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    for (let page = 1; page < 4; page++) {
      await act(async () => {
        await result.current.fetchNextPage();
      });
    }

    expect(result.current.postIds).toHaveLength(40);
    expect(new Set(result.current.postIds).size).toBe(40);
    expect(result.current.hasNextPage).toBe(false);
  });

  it("like flips the canonical post visible to every list reader", async () => {
    const { qc, fetchImpl, wrapper, likeRemote } = setup();
    const { result } = await renderHook(() => useHomeFeed({ fetchImpl }), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const firstId = result.current.postIds[0] ?? "";
    const before = getPostData(qc, firstId);
    if (!before) throw new Error("setup failed: missing canonical post");

    await act(async () => {
      await likePost(qc, firstId, { likeRemote });
    });

    const after = getPostData(qc, firstId);
    expect(after?.likedByMe).toBe(!before.likedByMe);
    expect(after?.likeCount).toBe(before.likeCount + (!before.likedByMe ? 1 : -1));
  });

  it("rolls back the like for the forced-failure post on page 1", async () => {
    const { qc, fetchImpl, wrapper, likeRemote } = setup();
    const { result } = await renderHook(() => useHomeFeed({ fetchImpl }), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.postIds).toContain("post-fail");

    const before = getPostData(qc, "post-fail");
    if (!before) throw new Error("setup failed: missing canonical post-fail");

    await act(async () => {
      await likePost(qc, "post-fail", { likeRemote });
    });

    expect(getPostData(qc, "post-fail")).toEqual(before);
  });

  it("prefetchPost warms the canonical cache without its feed page", async () => {
    const { qc, fetchImpl, wrapper } = setup();
    const { result } = await renderHook(() => useHomeFeed({ fetchImpl }), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    result.current.prefetchPost("p-1");
    await waitFor(() => {
      expect(getPostData(qc, "p-1")?.id).toBe("p-1");
    });
  });
});

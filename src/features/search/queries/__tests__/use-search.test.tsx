/**
 * Tests for F3 `useSearch`:
 * - gates fetching on `SEARCH_MIN_LENGTH`
 * - hydrates canonical post + user cache
 * - paginates matching posts
 */

import { renderHook, waitFor } from "@testing-library/react-native";
import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { getPostData } from "../../../../entities/post";
import { getUserData } from "../../../../entities/user";
import { createMockFetch } from "../../../../shared/api/mock-handlers";
import { createQueryClient } from "../../../../shared/query/query-client";
import { queryKeys } from "../../../../shared/query/query-keys";
import { useSearch } from "../use-search";

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
  return { qc, fetchImpl, wrapper };
}

describe("useSearch", () => {
  it("does not fetch for short queries", async () => {
    const { wrapper } = setup();
    const { result } = await renderHook(() => useSearch("a"), { wrapper });

    expect(result.current.enabled).toBe(false);
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("returns matching users + posts and hydrates canonical cache", async () => {
    const { qc, fetchImpl, wrapper } = setup();
    const { result } = await renderHook(() => useSearch("ava", { fetchImpl }), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.userIds.length).toBeGreaterThan(0);
    expect(result.current.postIds.length).toBeGreaterThan(0);

    const firstPostId = result.current.postIds[0] ?? "";
    expect(getPostData(qc, firstPostId)?.id).toBe(firstPostId);

    const firstUserId = result.current.userIds[0] ?? "";
    expect(getUserData(qc, firstUserId)?.id).toBe(firstUserId);
    expect(qc.getQueryData(queryKeys.search("ava"))).toBeDefined();
  });

  it("returns empty lists for an unknown keyword", async () => {
    const { fetchImpl, wrapper } = setup();
    const { result } = await renderHook(() => useSearch("zzz-no-match-zzz", { fetchImpl }), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.userIds).toHaveLength(0);
    expect(result.current.postIds).toHaveLength(0);
  });
});

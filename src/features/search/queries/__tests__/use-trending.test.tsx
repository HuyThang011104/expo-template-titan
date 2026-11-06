/**
 * Tests for G2.2 `useTrending` + hashtag count (mock-backed).
 *
 * - Trending returns hot tags sorted desc + hydrates suggested users.
 * - `fetchHashtagPage` returns the server total (`postCount`) for the header.
 * - Unknown tags stay 200-empty (never an error → never a crash).
 */

import { renderHook, waitFor } from "@testing-library/react-native";
import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { getUserData } from "../../../../entities/user";
import { createMockFetch } from "../../../../shared/api/mock-handlers";
import { createQueryClient } from "../../../../shared/query/query-client";
import { fetchHashtagPage, useHashtag } from "../use-hashtag";
import { fetchTrending, useTrending } from "../use-trending";

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

describe("useTrending", () => {
  it("returns tags desc + suggested users hydrated", async () => {
    const { qc, fetchImpl, wrapper } = setup();
    const { result } = await renderHook(() => useTrending({ fetchImpl }), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.tags.length).toBeGreaterThan(0);
    // tech (4) outranks travel (3) with the G2.2 seeds.
    expect(result.current.tags[0]?.tag).toBe("tech");
    expect(result.current.userIds.length).toBeGreaterThan(0);
    const firstUserId = result.current.userIds[0] ?? "";
    expect(getUserData(qc, firstUserId)?.id).toBe(firstUserId);
  });
});

describe("hashtag postCount (G2.2 header)", () => {
  it("returns the server total for a known tag", async () => {
    const { qc, fetchImpl } = setup();
    const page = await fetchHashtagPage(qc, "travel", null, { fetchImpl });
    expect(page.tag).toBe("travel");
    expect(page.postCount).toBe(3);
    expect(page.postIds).toContain("feed-p-3");
  });

  it("returns 0 count + empty ids for an unknown tag", async () => {
    const { fetchImpl, wrapper } = setup();
    const { result } = await renderHook(() => useHashtag("zzz-no-tag", { fetchImpl }), {
      wrapper,
    });
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.postIds).toHaveLength(0);
    expect(result.current.postCount).toBe(0);
  });
});

describe("fetchTrending (direct)", () => {
  it("hydrates users and keeps tag order", async () => {
    const { qc: queryClient, fetchImpl } = setup();
    const data = await fetchTrending(queryClient, { fetchImpl });
    const counts = data.tags.map((t) => t.postCount);
    expect([...counts].sort((a, b) => b - a)).toEqual(counts);
    expect(data.userIds.length).toBeGreaterThan(0);
  });
});

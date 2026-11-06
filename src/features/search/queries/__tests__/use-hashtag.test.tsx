/**
 * Tests for `useHashtag` (G1.5).
 *
 * - `travel` resolves the seeded post and hydrates the canonical cache.
 * - Unknown tags return an empty (successful) page, never an error.
 */

import { renderHook, waitFor } from "@testing-library/react-native";
import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { getPostData } from "../../../../entities/post";
import { createMockFetch } from "../../../../shared/api/mock-handlers";
import { createQueryClient } from "../../../../shared/query/query-client";
import { useHashtag } from "../use-hashtag";

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

describe("useHashtag", () => {
  it("returns seeded posts and hydrates the canonical cache", async () => {
    const { qc, fetchImpl, wrapper } = setup();
    const { result } = await renderHook(() => useHashtag("travel", { fetchImpl }), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.postIds).toContain("feed-p-3");
    expect(getPostData(qc, "feed-p-3")?.id).toBe("feed-p-3");
  });

  it("returns an empty page for unknown tags", async () => {
    const { fetchImpl, wrapper } = setup();
    const { result } = await renderHook(() => useHashtag("zzz-no-tag", { fetchImpl }), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.postIds).toHaveLength(0);
  });
});

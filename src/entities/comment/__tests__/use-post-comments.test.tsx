/**
 * Tests for `usePostComments` pagination wiring (G1.2).
 *
 * - Page 1 hydrates 10 top-level + 4 inline replies into canonical entries.
 * - `fetchNextPage` appends the remaining 2 top-level ids, then ends.
 */

import { act, renderHook, waitFor } from "@testing-library/react-native";
import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { createMockFetch } from "../../../shared/api/mock-handlers";
import { createQueryClient } from "../../../shared/query/query-client";
import { getCommentData } from "../cache";
import { usePostComments } from "../queries";

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

describe("usePostComments", () => {
  it("hydrates page 1 and paginates to 16 ids then ends", async () => {
    const { qc, fetchImpl, wrapper } = setup();
    const { result } = await renderHook(() => usePostComments("feed-p-1", { fetchImpl }), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.commentIds).toHaveLength(14);
    expect(getCommentData(qc, "c-p1-01")?.body).toContain("Top-level");

    await act(async () => {
      await result.current.fetchNextPage();
    });

    expect(result.current.commentIds).toHaveLength(16);
    expect(new Set(result.current.commentIds).size).toBe(16);
    expect(result.current.hasNextPage).toBe(false);
  });

  it("surfaces an error for unknown posts with retry", async () => {
    const { fetchImpl, wrapper } = setup();
    const { result } = await renderHook(() => usePostComments("ghost-post", { fetchImpl }), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});

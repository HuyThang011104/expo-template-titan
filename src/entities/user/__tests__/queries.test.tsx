/**
 * Tests for `entities/user/queries`.
 *
 * - `useUser` returns the fixture via mock fetch; unknown ids land in `error`.
 */

import { renderHook, waitFor } from "@testing-library/react-native";
import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { createMockFetch } from "../../../shared/api/mock-handlers";
import { createQueryClient } from "../../../shared/query/query-client";
import { useUser } from "../queries";

jest.mock("../../../shared/storage/secure", () => ({
  getSecureItem: jest.fn(async () => null),
  setSecureItem: jest.fn(async () => {}),
  deleteSecureItem: jest.fn(async () => {}),
}));

jest.mock("expo-splash-screen", () => ({
  hideAsync: jest.fn(async () => {}),
  preventAutoHideAsync: jest.fn(async () => {}),
}));

function makeWrapper() {
  const qc = createQueryClient();
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

const mockFetch = () => createMockFetch({ delayMs: 0 });

describe("useUser", () => {
  it("returns the user from the mock API", async () => {
    const { result } = await renderHook(() => useUser("u-1", { fetchImpl: mockFetch() }), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data?.handle).toBe("ava");
    expect(result.current.data?.avatarUrl).toContain("picsum.photos");
  });

  it("lands in error state for unknown ids (no crash)", async () => {
    const { result } = await renderHook(() => useUser("nope", { fetchImpl: mockFetch() }), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(result.current.data).toBeUndefined();
  });
});

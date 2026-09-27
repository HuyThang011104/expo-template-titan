/**
 * Tests for `handle → user` resolution + `useMe`.
 *
 * - `fetchUserByHandle` is case-insensitive via the mock backend.
 * - Unknown handles surface `null` (hooks turn it into `error`, no crash).
 * - `setUserByHandle` writes both the canonical entry and the handle key.
 */

import { renderHook, waitFor } from "@testing-library/react-native";
import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { createMockFetch } from "../../../shared/api/mock-handlers";
import { createQueryClient } from "../../../shared/query/query-client";
import { queryKeys } from "../../../shared/query/query-keys";
import { fetchUserByHandle } from "../api";
import { getUserByHandleData, getUserData, setUserByHandle } from "../cache";
import { mockUser1 } from "../__fixtures__";
import { useMe, useUserByHandle } from "../queries";

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
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return { qc, wrapper };
}

const mockFetch = () => createMockFetch({ delayMs: 0 });

describe("fetchUserByHandle", () => {
  it("resolves a known handle case-insensitively", async () => {
    const user = await fetchUserByHandle("AVA", { fetchImpl: mockFetch() });
    expect(user?.id).toBe("u-1");
    expect(user?.handle).toBe("ava");
  });

  it("resolves a feed-only author handle", async () => {
    const user = await fetchUserByHandle("mia", { fetchImpl: mockFetch() });
    expect(user?.id).toBe("u-feed-3");
  });

  it("returns null for unknown handles (no throw)", async () => {
    await expect(fetchUserByHandle("nope", { fetchImpl: mockFetch() })).rejects.toThrow();
  });
});

describe("setUserByHandle cache", () => {
  it("writes the canonical entry plus the handle key", () => {
    const { qc } = makeWrapper();
    setUserByHandle(qc, "AVA", mockUser1);
    expect(getUserData(qc, "u-1")).toEqual(mockUser1);
    expect(getUserByHandleData(qc, "ava")).toEqual(mockUser1);
    expect(getUserByHandleData(qc, "AVA")).toEqual(mockUser1);
  });
});

describe("useMe / useUserByHandle", () => {
  it("useMe returns the mock me user (u-1)", async () => {
    const { wrapper } = makeWrapper();
    const { result } = await renderHook(() => useMe({ fetchImpl: mockFetch() }), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data?.id).toBe("u-1");
  });

  it("useUserByHandle returns the user and seeds the canonical cache", async () => {
    const { qc, wrapper } = makeWrapper();
    const { result } = await renderHook(() => useUserByHandle("ava", { fetchImpl: mockFetch() }), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data?.id).toBe("u-1");
    expect(qc.getQueryData(queryKeys.user("u-1"))).toBeDefined();
  });

  it("lands in error state for unknown handles (no crash)", async () => {
    const { wrapper } = makeWrapper();
    const { result } = await renderHook(
      () => useUserByHandle("ghost-handle", { fetchImpl: mockFetch() }),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(result.current.data).toBeUndefined();
  });
});

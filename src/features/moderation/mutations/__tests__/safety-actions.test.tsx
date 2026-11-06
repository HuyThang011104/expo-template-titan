/**
 * Tests for F6.2 safety-action mutations:
 * - block/mute submit through the entity cache (optimistic + server-wins)
 * - submit-report posts once and returns the mock report id
 * - unknown users roll back
 */

import { act, renderHook } from "@testing-library/react-native";
import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { isBlockedByMe, isMutedByMe } from "../../../../entities/user";
import { createMockFetch } from "../../../../shared/api/mock-handlers";
import { createQueryClient } from "../../../../shared/query/query-client";
import { useBlockUser, useMuteUser, useSubmitReport } from "../use-safety";

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

describe("safety mutations", () => {
  it("submits a report once and returns the report id", async () => {
    const { fetchImpl, wrapper } = setup();
    const { result } = await renderHook(() => useSubmitReport({ fetchImpl }), { wrapper });

    let reportId = "";
    await act(async () => {
      reportId = await result.current.mutateAsync({
        targetType: "post",
        targetId: "feed-p-1",
        reason: "spam",
      });
    });

    expect(reportId.startsWith("r-")).toBe(true);
  });

  it("rejects an invalid report without sending", async () => {
    const { fetchImpl, wrapper } = setup();
    const { result } = await renderHook(() => useSubmitReport({ fetchImpl }), { wrapper });

    await expect(
      act(async () => {
        await result.current.mutateAsync({
          targetType: "post",
          targetId: "",
          reason: "spam",
        });
      }),
    ).rejects.toThrow();
  });

  it("block flips the canonical relationship", async () => {
    const { qc, fetchImpl, wrapper } = setup();
    const { result } = await renderHook(() => useBlockUser("u-feed-4", { fetchImpl }), {
      wrapper,
    });

    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(isBlockedByMe(qc, "u-feed-4")).toBe(true);
  });

  it("mute flips the canonical relationship", async () => {
    const { qc, fetchImpl, wrapper } = setup();
    const { result } = await renderHook(() => useMuteUser("u-feed-5", { fetchImpl }), {
      wrapper,
    });

    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(isMutedByMe(qc, "u-feed-5")).toBe(true);
  });

  it("block rolls back for unknown users", async () => {
    const { qc, fetchImpl, wrapper } = setup();
    const { result } = await renderHook(() => useBlockUser("nope", { fetchImpl }), {
      wrapper,
    });

    await act(async () => {
      await result.current.mutateAsync();
    });

    // Rollback keeps the default; the mutation itself resolves (no throw).
    expect(isBlockedByMe(qc, "nope")).toBe(false);
  });
});

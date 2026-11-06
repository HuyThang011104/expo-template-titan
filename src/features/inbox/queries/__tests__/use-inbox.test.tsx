/**
 * Tests for F5 `useInbox`:
 * - first page hydrates canonical entries with 5 unread
 * - cursor pagination reaches 26 unique items then ends
 * - per-tap mark-read flips and rolls back the forced-failure id
 * - mark-all syncs the visible page
 */

import { act, renderHook, waitFor } from "@testing-library/react-native";
import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { getNotificationData, markRead, markNotificationReadRemote } from "../../../../entities/notification";
import { createMockFetch } from "../../../../shared/api/mock-handlers";
import { createQueryClient } from "../../../../shared/query/query-client";
import { useInbox } from "../use-inbox";

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
  const markReadRemote = (id: string) => markNotificationReadRemote(id, { fetchImpl });
  return { qc, fetchImpl, wrapper, markReadRemote };
}

describe("useInbox", () => {
  it("hydrates the first page with 5 unread", async () => {
    const { fetchImpl, wrapper } = setup();
    const { result } = await renderHook(() => useInbox({ fetchImpl }), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.notificationIds).toHaveLength(10);
    expect(result.current.unreadCount).toBe(5);
  });

  it("paginates to 26 unique items then ends", async () => {
    const { fetchImpl, wrapper } = setup();
    const { result } = await renderHook(() => useInbox({ fetchImpl }), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    await act(async () => {
      await result.current.fetchNextPage();
    });
    await act(async () => {
      await result.current.fetchNextPage();
    });

    expect(result.current.notificationIds).toHaveLength(26);
    expect(new Set(result.current.notificationIds).size).toBe(26);
    expect(result.current.hasNextPage).toBe(false);
  });

  it("markRead flips one notification and keeps it read", async () => {
    const { qc, fetchImpl, wrapper, markReadRemote } = setup();
    const { result } = await renderHook(() => useInbox({ fetchImpl }), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const firstId = result.current.notificationIds[0] ?? "";
    expect(getNotificationData(qc, firstId)?.read).toBe(false);

    await act(async () => {
      await markRead(qc, firstId, { markReadRemote });
    });

    expect(getNotificationData(qc, firstId)?.read).toBe(true);
  });

  it("markRead rolls back the forced-failure notification", async () => {
    const { qc, fetchImpl, wrapper, markReadRemote } = setup();
    const { result } = await renderHook(() => useInbox({ fetchImpl }), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    await act(async () => {
      await result.current.fetchNextPage();
    });
    await act(async () => {
      await result.current.fetchNextPage();
    });
    expect(result.current.notificationIds).toContain("n-fail");

    await act(async () => {
      await markRead(qc, "n-fail", { markReadRemote });
    });

    expect(getNotificationData(qc, "n-fail")?.read).toBe(false);
  });

  it("markAllRead syncs the visible unread page", async () => {
    const { fetchImpl, wrapper } = setup();
    const { result } = await renderHook(() => useInbox({ fetchImpl }), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    await act(async () => {
      result.current.markAllRead();
    });

    await waitFor(() => {
      expect(result.current.markAllResult).toEqual({ synced: 5, failed: 0 });
    });
  });
});

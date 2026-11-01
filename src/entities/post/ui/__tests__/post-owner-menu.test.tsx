/**
 * Tests for the G1.3 owner menu on `PostCard`.
 *
 * - The owner sees `...` → Sửa/Xóa and never the viewer options sheet.
 * - Non-owners see the options sheet and never the owner one (fail-closed when
 *   the viewer is unknown too).
 * - The seeded `me` entry is written directly (no `entities/user` import,
 *   even in tests).
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { createQueryClient } from "../../../../shared/query/query-client";
import { queryKeys } from "../../../../shared/query/query-keys";
import { ThemeProvider } from "../../../../shared/ui/theme/theme-provider";
import { mockPost1, mockPost2 } from "../../__fixtures__";
import { hydrateFeedItem } from "../../cache";
import { PostCard } from "../post-card";

jest.mock("../../../../shared/storage/secure", () => ({
  getSecureItem: jest.fn(async () => null),
  setSecureItem: jest.fn(async () => {}),
  deleteSecureItem: jest.fn(async () => {}),
}));

jest.mock("expo-splash-screen", () => ({
  hideAsync: jest.fn(async () => {}),
  preventAutoHideAsync: jest.fn(async () => {}),
}));

// Inlined to respect the entity-to-entity boundary, even in tests.
const authorU1 = {
  id: "u-1",
  handle: "ava",
  displayName: "Ava Stone",
  avatarUrl: "https://picsum.photos/seed/u1/200",
};

const authorU2 = {
  id: "u-2",
  handle: "liam",
  displayName: "Liam Carter",
  avatarUrl: null,
};

function makeWrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <ThemeProvider initialName="light">
        <QueryClientProvider client={qc}>{children}</QueryClientProvider>
      </ThemeProvider>
    );
  };
}

function seedViewer(qc: QueryClient, id: string): void {
  qc.setQueryData(queryKeys.me, {
    id,
    handle: id === "u-1" ? "ava" : "liam",
    displayName: id === "u-1" ? "Ava Stone" : "Liam Carter",
    avatarUrl: null,
  });
}

describe("PostCard owner menu", () => {
  it("owner sees Sửa/Xóa and no options sheet", async () => {
    const qc = createQueryClient();
    seedViewer(qc, "u-1");
    hydrateFeedItem(qc, { post: mockPost1, author: authorU1 });

    await render(<PostCard postId="p-1" onOwnerEditPress={() => {}} />, {
      wrapper: makeWrapper(qc),
    });

    expect(screen.getByTestId("post-menu-p-1")).toBeTruthy();
    expect(screen.queryByTestId("post-options-p-1")).toBeNull();

    fireEvent.press(screen.getByTestId("post-menu-p-1"));
    await waitFor(() => {
      expect(screen.getByTestId("post-edit-button-p-1")).toBeTruthy();
    });
    expect(screen.getByTestId("post-delete-open-p-1")).toBeTruthy();
  });

  it("non-owner sees the options sheet and no owner menu", async () => {
    const qc = createQueryClient();
    seedViewer(qc, "u-1");
    hydrateFeedItem(qc, { post: mockPost2, author: authorU2 });

    await render(<PostCard postId="p-2" onOwnerEditPress={() => {}} />, {
      wrapper: makeWrapper(qc),
    });

    expect(screen.getByTestId("post-options-p-2")).toBeTruthy();
    expect(screen.queryByTestId("post-menu-p-2")).toBeNull();
  });

  it("unknown viewer hides the owner menu (fail-closed)", async () => {
    const qc = createQueryClient();
    hydrateFeedItem(qc, { post: mockPost1, author: authorU1 });

    await render(<PostCard postId="p-1" onOwnerEditPress={() => {}} />, {
      wrapper: makeWrapper(qc),
    });

    await waitFor(() => {
      expect(screen.getByTestId("post-options-p-1")).toBeTruthy();
    });
    expect(screen.queryByTestId("post-menu-p-1")).toBeNull();
  });

  it("delete confirm renders with cancel (no network until confirmed)", async () => {
    const qc = createQueryClient();
    seedViewer(qc, "u-1");
    hydrateFeedItem(qc, { post: mockPost1, author: authorU1 });

    await render(<PostCard postId="p-1" onOwnerEditPress={() => {}} />, {
      wrapper: makeWrapper(qc),
    });

    fireEvent.press(screen.getByTestId("post-menu-p-1"));
    await waitFor(() => {
      expect(screen.getByTestId("post-delete-open-p-1")).toBeTruthy();
    });
    fireEvent.press(screen.getByTestId("post-delete-open-p-1"));
    await waitFor(() => {
      expect(screen.getByTestId("post-delete-confirm-p-1")).toBeTruthy();
    });
    expect(screen.getByTestId("post-delete-cancel-p-1")).toBeTruthy();
  });
});

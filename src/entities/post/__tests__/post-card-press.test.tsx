/**
 * Tests for F5 card press + long-press routing.
 *
 * - `onPress` is the feature-owned navigation callback (no router in entities).
 * - Long-press opens the owner sheet for owners, and falls back to the
 *   safety entry point for everyone else.
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { createQueryClient } from "../../../shared/query/query-client";
import { queryKeys } from "../../../shared/query/query-keys";
import { ThemeProvider } from "../../../shared/ui/theme/theme-provider";
import { mockPost1, mockPost2 } from "../__fixtures__";
import { hydrateFeedItem } from "../cache";
import { PostCard } from "../ui/post-card";

jest.mock("../../../shared/storage/secure", () => ({
  getSecureItem: jest.fn(async () => null),
  setSecureItem: jest.fn(async () => {}),
  deleteSecureItem: jest.fn(async () => {}),
}));

jest.mock("expo-splash-screen", () => ({
  hideAsync: jest.fn(async () => {}),
  preventAutoHideAsync: jest.fn(async () => {}),
}));

const authorU1 = {
  id: "u-1",
  handle: "ava",
  displayName: "Ava Stone",
  avatarUrl: null,
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

describe("PostCard press", () => {
  it("calls the feature-owned onPress callback", async () => {
    const qc = createQueryClient();
    hydrateFeedItem(qc, { post: mockPost1, author: authorU1 });
    const onPress = jest.fn();

    await render(<PostCard postId="p-1" testID="post-card-p-1" onPress={onPress} />, {
      wrapper: makeWrapper(qc),
    });

    fireEvent.press(screen.getByTestId("post-card-p-1"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("owner long-press opens the owner sheet", async () => {
    const qc = createQueryClient();
    seedViewer(qc, "u-1");
    hydrateFeedItem(qc, { post: mockPost1, author: authorU1 });

    await render(
      <PostCard
        postId="p-1"
        testID="post-card-p-1"
        onPress={() => {}}
        onOwnerEditPress={() => {}}
      />,
      { wrapper: makeWrapper(qc) },
    );

    fireEvent(screen.getByTestId("post-card-p-1"), "longPress");
    await waitFor(() => {
      expect(screen.getByTestId("post-edit-button-p-1")).toBeTruthy();
    });
  });

  it("forwards media taps with the pressed index", async () => {
    const qc = createQueryClient();
    hydrateFeedItem(qc, { post: mockPost1, author: authorU1 });
    const onMediaPress = jest.fn();

    await render(<PostCard postId="p-1" onMediaPress={onMediaPress} />, {
      wrapper: makeWrapper(qc),
    });

    fireEvent.press(screen.getByTestId("media-grid-p-1-0"));
    expect(onMediaPress).toHaveBeenCalledWith(0);
  });

  it("non-owner long-press opens the options sheet", async () => {
    const qc = createQueryClient();
    seedViewer(qc, "u-1");
    hydrateFeedItem(qc, { post: mockPost2, author: authorU2 });

    await render(
      <PostCard
        postId="p-2"
        testID="post-card-p-2"
        onPress={() => {}}
        onOwnerEditPress={() => {}}
      />,
      { wrapper: makeWrapper(qc) },
    );

    fireEvent(screen.getByTestId("post-card-p-2"), "longPress");
    await waitFor(() => {
      expect(screen.getByTestId("post-options-sheet-p-2")).toBeTruthy();
    });
  });
});

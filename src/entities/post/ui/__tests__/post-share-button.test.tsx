/**
 * Tests for `PostShareButton` (G1.4 entity UI).
 *
 * - Press opens the share sheet with a `<scheme>://post/<id>` link.
 * - The default scheme resolves from `expo-linking` (mocked in jest).
 * - A throwing share fn shows inline error, never a crash.
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { createQueryClient } from "../../../../shared/query/query-client";
import { ThemeProvider } from "../../../../shared/ui/theme/theme-provider";
import { PostShareButton } from "../post-share-button";

jest.mock("../../../../shared/storage/secure", () => ({
  getSecureItem: jest.fn(async () => null),
  setSecureItem: jest.fn(async () => {}),
  deleteSecureItem: jest.fn(async () => {}),
}));

jest.mock("expo-splash-screen", () => ({
  hideAsync: jest.fn(async () => {}),
  preventAutoHideAsync: jest.fn(async () => {}),
}));

function wrapper(qc: ReturnType<typeof createQueryClient>) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <ThemeProvider initialName="light">
        <QueryClientProvider client={qc}>{children}</QueryClientProvider>
      </ThemeProvider>
    );
  };
}

describe("PostShareButton", () => {
  it("shares a scheme deep link for the post", async () => {
    const messages: string[] = [];
    await render(
      <PostShareButton
        postId="feed-p-1"
        schemeOverride="titan-dev"
        shareFn={async (content) => {
          messages.push(content.message);
        }}
      />,
      { wrapper: wrapper(createQueryClient()) },
    );

    fireEvent.press(screen.getByTestId("share-button-feed-p-1"));

    await waitFor(() => {
      expect(messages).toEqual(["titan-dev://post/feed-p-1"]);
    });
  });

  it("resolves the scheme from expo-linking by default (jest mock)", async () => {
    const messages: string[] = [];
    await render(
      <PostShareButton
        postId="p-1"
        shareFn={async (content) => {
          messages.push(content.message);
        }}
      />,
      { wrapper: wrapper(createQueryClient()) },
    );

    fireEvent.press(screen.getByTestId("share-button-p-1"));

    await waitFor(() => {
      expect(messages).toEqual(["titan-dev://post/p-1"]);
    });
  });

  it("shows inline error when sharing fails", async () => {
    await render(
      <PostShareButton
        postId="p-1"
        schemeOverride="titan-dev"
        shareFn={async () => {
          throw new Error("no sheet");
        }}
      />,
      { wrapper: wrapper(createQueryClient()) },
    );

    fireEvent.press(screen.getByTestId("share-button-p-1"));

    await waitFor(() => {
      expect(screen.getByTestId("share-error-p-1")).toBeTruthy();
    });
  });
});

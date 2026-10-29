/**
 * Tests for the F14 action row.
 *
 * - Comment is the feature-owned opener (PF3.1 uses `focus=comment`).
 * - Like fires the light haptic on like only (unlike is silent).
 * - The count is hidden at zero.
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { hapticLight } from "../../../../shared/lib/haptics";
import { createQueryClient } from "../../../../shared/query/query-client";
import { ThemeProvider } from "../../../../shared/ui/theme/theme-provider";
import { mockPost1 } from "../../__fixtures__";
import { hydrateFeedItem } from "../../cache";
import type { Post } from "../../model";
import { PostActions } from "../post-actions";

jest.mock("../../../../shared/storage/secure", () => ({
  getSecureItem: jest.fn(async () => null),
  setSecureItem: jest.fn(async () => {}),
  deleteSecureItem: jest.fn(async () => {}),
}));

jest.mock("expo-splash-screen", () => ({
  hideAsync: jest.fn(async () => {}),
  preventAutoHideAsync: jest.fn(async () => {}),
}));

jest.mock("../../../../shared/lib/haptics", () => ({
  hapticLight: jest.fn(async () => {}),
  hapticSuccess: jest.fn(async () => {}),
  hapticWarning: jest.fn(async () => {}),
}));

const author = {
  id: "u-1",
  handle: "ava",
  displayName: "Ava Stone",
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

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("PostActions", () => {
  beforeEach(() => {
    jest.mocked(hapticLight).mockClear();
  });

  it("calls back for comment", async () => {
    const qc = createQueryClient();
    hydrateFeedItem(qc, { post: mockPost1, author });
    const onCommentPress = jest.fn();

    await render(<PostActions postId="p-1" onCommentPress={onCommentPress} />, {
      wrapper: makeWrapper(qc),
    });

    fireEvent.press(screen.getByTestId("comment-button-p-1"));
    expect(onCommentPress).toHaveBeenCalledTimes(1);
  });

  it("fires the light haptic when liking but not when unliking", async () => {
    const qc = createQueryClient();
    hydrateFeedItem(qc, { post: mockPost1, author });

    const realFetch = global.fetch;
    global.fetch = jest.fn(async () =>
      jsonResponse({ ...mockPost1, likedByMe: true, likeCount: mockPost1.likeCount + 1 }),
    ) as typeof fetch;

    try {
      await render(<PostActions postId="p-1" />, { wrapper: makeWrapper(qc) });

      fireEvent.press(screen.getByTestId("like-button-p-1"));
      await waitFor(() => {
        expect(hapticLight).toHaveBeenCalledTimes(1);
      });
    } finally {
      global.fetch = realFetch;
    }
  });

  it("hides the count at zero", async () => {
    const qc = createQueryClient();
    const zeroPost: Post = { ...mockPost1, likeCount: 0 };
    hydrateFeedItem(qc, { post: zeroPost, author });

    await render(<PostActions postId="p-1" />, { wrapper: makeWrapper(qc) });

    expect(screen.queryByText("0")).toBeNull();
  });
});

/**
 * Tests for the PF3.1 comment row anatomy.
 *
 * - Avatar 32 leading + `displayName @handle · time` line + body + actions.
 * - Replies indent one level by `32 + 8`.
 * - Existing testIDs and the reply callback stay intact.
 */

import { fireEvent, render, screen } from "@testing-library/react-native";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { createQueryClient } from "../../../shared/query/query-client";
import { ThemeProvider } from "../../../shared/ui/theme/theme-provider";
import type { CommentWireItem } from "../model";
import { hydrateCommentItem } from "../cache";
import { CommentRow } from "../ui/comment-row";

jest.mock("../../../shared/storage/secure", () => ({
  getSecureItem: jest.fn(async () => null),
  setSecureItem: jest.fn(async () => {}),
  deleteSecureItem: jest.fn(async () => {}),
}));

jest.mock("expo-splash-screen", () => ({
  hideAsync: jest.fn(async () => {}),
  preventAutoHideAsync: jest.fn(async () => {}),
}));

const wire: CommentWireItem = {
  comment: {
    id: "c-1",
    postId: "p-1",
    authorId: "u-1",
    body: "Nice one!",
    parentId: null,
    likeCount: 3,
    likedByMe: false,
    createdAt: "2026-09-09T10:00:00.000Z",
  },
  author: {
    id: "u-1",
    handle: "ava",
    displayName: "Ava Stone",
    avatarUrl: null,
  },
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

describe("CommentRow", () => {
  it("renders avatar, author line, body and actions with existing testIDs", async () => {
    const qc = createQueryClient();
    hydrateCommentItem(qc, wire);

    await render(<CommentRow commentId="c-1" onReplyPress={() => {}} />, {
      wrapper: makeWrapper(qc),
    });

    expect(screen.getByTestId("comment-row-c-1")).toBeTruthy();
    expect(screen.getByLabelText("Ava Stone")).toBeTruthy();
    expect(screen.getByText(/^Ava Stone @ava ·/)).toBeTruthy();
    expect(screen.getByText("Nice one!")).toBeTruthy();
    expect(screen.getByTestId("comment-like-c-1")).toBeTruthy();
    expect(screen.getByTestId("comment-reply-c-1")).toBeTruthy();
    expect(screen.getByText("Reply")).toBeTruthy();
  });

  it("calls back with the canonical handle on Reply", async () => {
    const qc = createQueryClient();
    hydrateCommentItem(qc, wire);
    const onReplyPress = jest.fn();

    await render(<CommentRow commentId="c-1" onReplyPress={onReplyPress} />, {
      wrapper: makeWrapper(qc),
    });

    fireEvent.press(screen.getByTestId("comment-reply-c-1"));
    expect(onReplyPress).toHaveBeenCalledWith({ id: "c-1", handle: "ava" });
  });

  it("indents replies by 32 + 8", async () => {
    const qc = createQueryClient();
    hydrateCommentItem(qc, wire);

    await render(<CommentRow commentId="c-1" depth={1} />, { wrapper: makeWrapper(qc) });

    expect(screen.getByTestId("comment-row-c-1")).toHaveStyle({ paddingLeft: 40 });
  });
});

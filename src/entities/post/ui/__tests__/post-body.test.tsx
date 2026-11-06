/**
 * Tests for `PostBody` mention/hashtag spans (G1.5 entity UI).
 *
 * Mention/hashtag spans call back (feature navigation); plain text has no
 * press handler so it can't mis-tap. Link confirmation lives in
 * `post-body-link.test.tsx` (separate file: React 19 + RNTL14 leaks act
 * scope across tests in one file, which flakes later queries).
 */

import { fireEvent, render, screen } from "@testing-library/react-native";
import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { createQueryClient } from "../../../../shared/query/query-client";
import { ThemeProvider } from "../../../../shared/ui/theme/theme-provider";
import { PostBody } from "../post-body";

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

const BODY = "Hi @ava, see #travel https://titan.example/p/1!";

describe("PostBody", () => {
  it("calls back for mention and hashtag taps", async () => {
    const mentions: string[] = [];
    const tags: string[] = [];
    await render(
      <PostBody
        postId="p-9"
        body={BODY}
        onMentionPress={(handle) => {
          mentions.push(handle);
        }}
        onHashtagPress={(tag) => {
          tags.push(tag);
        }}
      />,
      { wrapper: wrapper(createQueryClient()) },
    );

    fireEvent.press(screen.getByTestId("mention-ava-p-9"));
    fireEvent.press(screen.getByTestId("hashtag-travel-p-9"));

    expect(mentions).toEqual(["ava"]);
    expect(tags).toEqual(["travel"]);
  });
});

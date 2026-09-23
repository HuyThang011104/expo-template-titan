/**
 * Tests for `entities/post/ui/post-card`.
 *
 * - Seeds the canonical cache via `hydrateFeedItem`, same flow as the feed hydrator.
 * - Unknown ids render the "Post unavailable" fallback.
 */

import { render, screen, waitFor } from "@testing-library/react-native";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { createQueryClient } from "../../../shared/query/query-client";
import { ThemeProvider } from "../../../shared/ui/theme/theme-provider";
import { mockPost1 } from "../__fixtures__";
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

// Inlined to respect the entity-to-entity boundary, even in tests.
const author = {
  id: "u-1",
  handle: "ava",
  displayName: "Ava Stone",
  avatarUrl: "https://picsum.photos/seed/u1/200",
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

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("PostCard", () => {
  it("renders body + author from the seeded canonical (no feed feature)", async () => {
    const qc = createQueryClient();
    hydrateFeedItem(qc, { post: mockPost1, author });

    await render(<PostCard postId="p-1" />, { wrapper: makeWrapper(qc) });

    expect(screen.getByText(mockPost1.body)).toBeTruthy();
    expect(screen.getByText("Ava Stone")).toBeTruthy();
    expect(screen.getByText("@ava")).toBeTruthy();
  });

  it("renders fallback for unknown posts (no crash)", async () => {
    const realFetch = global.fetch;
    global.fetch = jest.fn(async () => jsonResponse({ message: "not found" }, 404)) as typeof fetch;
    try {
      const qc = createQueryClient();
      await render(<PostCard postId="nope" />, { wrapper: makeWrapper(qc) });

      await waitFor(() => {
        expect(screen.getByText("Post unavailable")).toBeTruthy();
      });
    } finally {
      global.fetch = realFetch;
    }
  });
});

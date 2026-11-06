/**
 * Tests for `PostBody` link confirmation (G1.5 entity UI).
 *
 * Lives apart from `post-body.test.tsx`: React 19 + RNTL14 leaks act scope
 * across tests in one file, which flakes queries after the first render.
 * Links open a confirm sheet first; Open calls the injected opener with
 * the exact URL, failures show inline, Cancel closes without opening.
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
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

describe("PostBody link confirm", () => {
  it("confirms before opening a link, and surfaces opener failure", async () => {
    const opened: string[] = [];
    await render(
      <PostBody
        postId="p-9"
        body={BODY}
        openFn={async (url) => {
          opened.push(url);
          throw new Error("blocked");
        }}
      />,
      { wrapper: wrapper(createQueryClient()) },
    );

    fireEvent.press(screen.getByTestId("link-5-p-9"));
    await waitFor(() => {
      expect(screen.getByTestId("link-confirm-p-9")).toBeTruthy();
    });
    expect(opened).toHaveLength(0);

    fireEvent.press(screen.getByTestId("link-open-p-9"));
    await waitFor(() => {
      expect(screen.getByTestId("link-error-p-9")).toBeTruthy();
    });
    expect(opened).toEqual(["https://titan.example/p/1"]);
  });

  it("cancel closes the confirm without opening", async () => {
    const opened: string[] = [];
    await render(
      <PostBody
        postId="p-9"
        body={BODY}
        openFn={async (url) => {
          opened.push(url);
        }}
      />,
      { wrapper: wrapper(createQueryClient()) },
    );

    fireEvent.press(screen.getByTestId("link-5-p-9"));
    await waitFor(() => {
      expect(screen.getByTestId("link-confirm-p-9")).toBeTruthy();
    });
    fireEvent.press(screen.getByTestId("link-cancel-p-9"));
    await waitFor(() => {
      expect(screen.queryByTestId("link-confirm-p-9")).toBeNull();
    });
    expect(opened).toHaveLength(0);
  });
});

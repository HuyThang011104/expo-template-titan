/**
 * Tests for `CommentComposer` (G1.2 feature UI).
 *
 * - Send posts once, clears the input, and clears the reply target.
 * - Empty input keeps Send disabled (no empty post, no throw).
 * - Missing session shows an inline error and never crashes (the route is
 *   `Stack.Protected`, so this is a defensive path).
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { createMockFetch } from "../../../../shared/api/mock-handlers";
import { createQueryClient } from "../../../../shared/query/query-client";
import { SessionContext, type SessionContextValue } from "../../../../shared/auth/session-provider";
import { ThemeProvider } from "../../../../shared/ui/theme/theme-provider";
import { CommentComposer } from "../comment-composer";

jest.mock("../../../../shared/storage/secure", () => ({
  getSecureItem: jest.fn(async () => null),
  setSecureItem: jest.fn(async () => {}),
  deleteSecureItem: jest.fn(async () => {}),
}));

jest.mock("expo-splash-screen", () => ({
  hideAsync: jest.fn(async () => {}),
  preventAutoHideAsync: jest.fn(async () => {}),
}));

const signedIn: SessionContextValue = {
  session: "dev-token",
  isLoading: false,
  signIn: () => {},
  signOut: () => {},
};

const signedOut: SessionContextValue = {
  session: null,
  isLoading: false,
  signIn: () => {},
  signOut: () => {},
};

function setup(session: SessionContextValue) {
  const qc = createQueryClient();
  const fetchImpl = createMockFetch({ delayMs: 0 });
  const cleared: string[] = [];
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>
      <ThemeProvider initialName="light">
        <SessionContext.Provider value={session}>{children}</SessionContext.Provider>
      </ThemeProvider>
    </QueryClientProvider>
  );
  return { qc, fetchImpl, wrapper, cleared };
}

describe("CommentComposer", () => {
  it("posts once and clears input + reply target", async () => {
    const { fetchImpl, wrapper, cleared } = setup(signedIn);
    await render(
      <CommentComposer
        postId="p-2"
        replyTo={null}
        onClearReply={() => {
          cleared.push("cleared");
        }}
        fetchImpl={fetchImpl}
      />,
      { wrapper },
    );

    fireEvent.changeText(screen.getByTestId("comment-input"), "Nice post!");
    // State flushes async in this env (React 19 without act); settle first.
    await waitFor(() => {
      expect(screen.getByTestId("comment-input").props.value).toBe("Nice post!");
    });
    fireEvent.press(screen.getByTestId("comment-send-button"));

    await waitFor(() => {
      expect(screen.getByTestId("comment-input").props.value).toBe("");
    });
    expect(cleared).toEqual(["cleared"]);
  });

  it("keeps Send disabled for empty input", async () => {
    const { fetchImpl, wrapper } = setup(signedIn);
    await render(
      <CommentComposer postId="p-2" replyTo={null} onClearReply={() => {}} fetchImpl={fetchImpl} />,
      { wrapper },
    );

    expect(screen.getByTestId("comment-send-button").props.accessibilityState.disabled).toBe(
      true,
    );
  });

  it("shows an inline error without crashing when signed out", async () => {
    const { fetchImpl, wrapper } = setup(signedOut);
    await render(
      <CommentComposer postId="p-2" replyTo={null} onClearReply={() => {}} fetchImpl={fetchImpl} />,
      { wrapper },
    );

    fireEvent.changeText(screen.getByTestId("comment-input"), "Hello?");
    await waitFor(() => {
      expect(screen.getByTestId("comment-input").props.value).toBe("Hello?");
    });
    fireEvent.press(screen.getByTestId("comment-send-button"));

    await waitFor(() => {
      expect(screen.getByTestId("comment-error")).toBeTruthy();
    });
  });

  it("shows the reply banner and cancels it", async () => {
    const { fetchImpl, wrapper } = setup(signedIn);
    let cleared = 0;
    await render(
      <CommentComposer
        postId="p-2"
        replyTo={{ id: "c-x", handle: "liam" }}
        onClearReply={() => {
          cleared += 1;
        }}
        fetchImpl={fetchImpl}
      />,
      { wrapper },
    );

    expect(screen.getByTestId("comment-reply-banner")).toBeTruthy();
    fireEvent.press(screen.getByTestId("comment-reply-cancel"));
    expect(cleared).toBe(1);
  });
});

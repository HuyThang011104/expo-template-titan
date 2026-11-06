/**
 * Tests for the F6 body clamp + inline "more" affordance.
 *
 * Separate file from `post-body.test.tsx` (React 19 + RNTL14 act-scope leak
 * across tests in one file). `onTextLayout` is invoked directly: Jest never
 * lays out text, and RNTL does not dispatch non-responder events on `Text`,
 * so the truncation heuristic is exercised at its prop boundary.
 */

import { act, fireEvent, render, screen } from "@testing-library/react-native";
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

function layout(lines: number) {
  return {
    nativeEvent: {
      lines: Array.from({ length: lines }, () => ({ text: "line" })),
    },
  };
}

async function fireTextLayout(testID: string, lines: number): Promise<void> {
  const body = screen.getByTestId(testID);
  await act(async () => {
    body.props.onTextLayout(layout(lines));
  });
}

describe("PostBody clamp", () => {
  it("stays clamped and hides 'more' until the text overflows", async () => {
    await render(<PostBody postId="p-9" body="Short body" clampLines={3} />, {
      wrapper: wrapper(createQueryClient()),
    });

    expect(screen.getByTestId("post-body-p-9").props.numberOfLines).toBe(3);
    expect(screen.queryByTestId("post-body-more-p-9")).toBeNull();

    await fireTextLayout("post-body-p-9", 2);
    expect(screen.queryByTestId("post-body-more-p-9")).toBeNull();
  });

  it("shows 'more' on overflow and expands in place on press", async () => {
    await render(<PostBody postId="p-9" body="Long body" clampLines={3} />, {
      wrapper: wrapper(createQueryClient()),
    });

    await fireTextLayout("post-body-p-9", 3);

    const more = screen.getByTestId("post-body-more-p-9");
    await act(async () => {
      fireEvent.press(more);
    });

    expect(screen.getByTestId("post-body-p-9").props.numberOfLines).toBeUndefined();
    expect(screen.queryByTestId("post-body-more-p-9")).toBeNull();
  });
});

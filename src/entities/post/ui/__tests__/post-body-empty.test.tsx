/**
 * Empty-caption posts (P4): `PostBody` renders nothing for media-only posts.
 * Kept in its own file because React 19 + RNTL leaks act scopes across tests.
 */

import { render, screen } from "@testing-library/react-native";
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

function wrapper({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider initialName="light">
      <QueryClientProvider client={createQueryClient()}>{children}</QueryClientProvider>
    </ThemeProvider>
  );
}

describe("PostBody (empty)", () => {
  it("renders nothing for a media-only post", async () => {
    await render(<PostBody postId="p-empty" body="   " />, { wrapper });

    expect(screen.queryByTestId("post-body-p-empty")).toBeNull();
    expect(screen.toJSON()).toBeNull();
  });
});

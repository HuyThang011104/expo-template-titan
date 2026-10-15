/**
 * Tests for `ProfileHeader` (pure presentational).
 */

import { render, screen } from "@testing-library/react-native";
import type { ReactNode } from "react";

import { ThemeProvider } from "../../../../shared/ui/theme/theme-provider";
import { ProfileHeader } from "../profile-header";

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider initialName="light">{children}</ThemeProvider>;
}

const stubUser = {
  id: "u-1",
  handle: "ava",
  displayName: "Ava Stone",
  avatarUrl: "https://picsum.photos/seed/u1/200",
  bio: "Coffee + trail runs.",
  coverUrl: "https://picsum.photos/seed/u1cover/800/300",
  link: "https://titan.example/ava",
  privacySettings: {
    messageAudience: "everyone",
    postVisibility: "public",
    tagAudience: "everyone",
  } as const,
};

describe("ProfileHeader", () => {
  it("renders display name and handle with a testID", async () => {
    await render(<ProfileHeader user={stubUser} testID="profile-header-ava" />, { wrapper });
    expect(screen.getByTestId("profile-header-ava")).toBeTruthy();
    expect(screen.getByText("Ava Stone")).toBeTruthy();
    expect(screen.getByText("@ava")).toBeTruthy();
  });

  it("renders bio/link/cover when present (G2.1)", async () => {
    await render(<ProfileHeader user={stubUser} testID="profile-header-ava" />, { wrapper });
    expect(screen.getByTestId("profile-header-ava-bio")).toBeTruthy();
    expect(screen.getByTestId("profile-header-ava-link")).toBeTruthy();
    expect(screen.getByTestId("profile-header-ava-cover")).toBeTruthy();
  });

  it("omits bio/link/cover when null (G2.1)", async () => {
    const minimal = { ...stubUser, bio: null, coverUrl: null, link: null };
    await render(<ProfileHeader user={minimal} testID="profile-header-min" />, { wrapper });
    expect(screen.queryByTestId("profile-header-min-bio")).toBeNull();
    expect(screen.queryByTestId("profile-header-min-link")).toBeNull();
    expect(screen.queryByTestId("profile-header-min-cover")).toBeNull();
  });
});

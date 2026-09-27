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
};

describe("ProfileHeader", () => {
  it("renders display name and handle with a testID", async () => {
    await render(<ProfileHeader user={stubUser} testID="profile-header-ava" />, { wrapper });
    expect(screen.getByTestId("profile-header-ava")).toBeTruthy();
    expect(screen.getByText("Ava Stone")).toBeTruthy();
    expect(screen.getByText("@ava")).toBeTruthy();
  });
});

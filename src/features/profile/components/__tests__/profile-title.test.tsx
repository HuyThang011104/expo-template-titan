/**
 * Tests for the Q7 `ProfileHeaderTitle` node (PF4.2).
 *
 * Opacity is driven native-side; Jest asserts the structure that matters:
 * both stacked labels render, and the header exposes the handle first.
 */

import { render, screen } from "@testing-library/react-native";
import type { ReactNode } from "react";
import { useSharedValue } from "react-native-reanimated";

import { ThemeProvider } from "../../../../shared/ui/theme/theme-provider";
import type { TitleSwitchRange } from "../../lib/title-progress";
import { ProfileHeaderTitle } from "../profile-title";

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider initialName="light">{children}</ThemeProvider>;
}

function Harness() {
  const scrollY = useSharedValue(0);
  const switchRange = useSharedValue<TitleSwitchRange>({ start: 200, end: 300 });

  return (
    <ProfileHeaderTitle
      scrollY={scrollY}
      switchRange={switchRange}
      handle="ava"
      displayName="Ava Stone"
    />
  );
}

describe("ProfileHeaderTitle", () => {
  it("renders both stacked labels with the required testIDs", async () => {
    await render(<Harness />, { wrapper });

    expect(screen.getByTestId("profile-title-handle")).toBeTruthy();
    expect(screen.getByTestId("profile-title-name")).toBeTruthy();
    expect(screen.getByText("@ava")).toBeTruthy();
    expect(screen.getByText("Ava Stone")).toBeTruthy();
  });

  it("labels the header with the handle before the switch", async () => {
    await render(<Harness />, { wrapper });

    expect(screen.getByTestId("profile-title").props.accessibilityLabel).toBe("@ava");
  });
});

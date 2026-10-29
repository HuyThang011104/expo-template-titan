/**
 * Tests for the PF4.3 sticky tabs overlay.
 *
 * Opacity is native; Jest asserts the idle contract: both sticky tabs render,
 * the overlay starts non-interactive, and it is hidden from assistive tech
 * until the in-list tabs scroll past the measured threshold.
 */

import { render, screen } from "@testing-library/react-native";
import type { ReactNode } from "react";
import { useSharedValue } from "react-native-reanimated";

import { ThemeProvider } from "../../../../shared/ui/theme/theme-provider";
import { ProfileStickyTabs } from "../profile-sticky-tabs";

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider initialName="light">{children}</ThemeProvider>;
}

function Harness() {
  const scrollY = useSharedValue(0);
  const tabsBottom = useSharedValue(400);

  return (
    <ProfileStickyTabs
      scrollY={scrollY}
      tabsBottom={tabsBottom}
      value="posts"
      onChange={() => {}}
    />
  );
}

describe("ProfileStickyTabs", () => {
  it("renders both sticky tabs while inactive", async () => {
    await render(<Harness />, { wrapper });

    expect(screen.getByTestId("profile-sticky-tabs", { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByTestId("profile-sticky-tab-posts", { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByTestId("profile-sticky-tab-saved", { includeHiddenElements: true })).toBeTruthy();
  });

  it("starts non-interactive and hidden from screen readers", async () => {
    await render(<Harness />, { wrapper });

    const overlay = screen.getByTestId("profile-sticky-tabs", { includeHiddenElements: true });
    expect(overlay.props.pointerEvents).toBe("none");
    expect(overlay.props.accessibilityElementsHidden).toBe(true);
  });
});

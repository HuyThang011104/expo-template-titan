/**
 * Navigation theme + header factory contracts (spec §4.9, §7.4).
 */

import { DarkTheme, DefaultTheme } from "expo-router";

import {
  breakpoint,
  colors,
  elevation,
  iconSize,
  layout,
  motion,
  radius,
  spacing,
  typography,
  type Theme,
  type ThemeName,
} from "../../theme/tokens";
import { headerOptions } from "../header-options";
import { navigationTheme } from "../navigation-theme";

function makeTheme(name: ThemeName): Theme {
  return {
    name,
    color: colors[name],
    space: spacing,
    radius,
    type: typography,
    icon: iconSize,
    elevation,
    motion,
    breakpoint,
    layout,
  };
}

describe("navigationTheme", () => {
  it.each([
    ["light", DefaultTheme],
    ["dark", DarkTheme],
  ] as const)("derives %s chrome from tokens while keeping fonts", (name, base) => {
    const theme = makeTheme(name);
    const result = navigationTheme(theme);

    expect(result.dark).toBe(name === "dark");
    expect(result.fonts).toBe(base.fonts);
    expect(result.colors.primary).toBe(theme.color.primary);
    expect(result.colors.background).toBe(theme.color.background);
    expect(result.colors.card).toBe(theme.color.surface);
    expect(result.colors.text).toBe(theme.color.textPrimary);
    expect(result.colors.border).toBe(theme.color.border);
    expect(result.colors.notification).toBe(theme.color.danger);
  });
});

describe("headerOptions", () => {
  it("uses SDK 57 prop names and token colors", () => {
    const theme = makeTheme("light");
    const options = headerOptions(theme, { title: "Home", large: true });

    expect(options.title).toBe("Home");
    expect(options.headerLargeTitleEnabled).toBe(true);
    expect("headerLargeTitle" in options).toBe(false);
    expect(options.headerBackButtonDisplayMode).toBe("minimal");
    expect("headerBackTitleVisible" in options).toBe(false);
    expect(options.headerShadowVisible).toBe(false);
    expect(options.headerTintColor).toBe(theme.color.primary);
    expect(options.headerStyle).toEqual({ backgroundColor: theme.color.surface });
    expect(options.headerTitleStyle).toMatchObject({
      color: theme.color.textPrimary,
      fontSize: 17,
      fontWeight: "600",
    });
  });

  it("keeps the dark header readable and renders the right action", () => {
    const theme = makeTheme("dark");
    const right = () => null;
    const options = headerOptions(theme, { title: "Profile", right });

    expect(options.headerStyle).toEqual({ backgroundColor: theme.color.surface });
    expect(options.headerTitleStyle).toMatchObject({ color: theme.color.textPrimary });
    expect(options.headerRight).toBe(right);
  });
});

/**
 * Token contract tests (spec §4): semantic parity, legacy aliases, scales.
 */

import { renderHook } from "@testing-library/react-native";
import type { ReactNode } from "react";

import { semanticColors } from "../semantic";
import { ThemeProvider } from "../theme-provider";
import { colors, space, spacing, tokens, typography } from "../tokens";
import { useTheme } from "../use-theme";

describe("design tokens", () => {
  it("keeps light/dark semantic key parity", () => {
    expect(Object.keys(semanticColors.light).sort()).toEqual(
      Object.keys(semanticColors.dark).sort(),
    );
  });

  it("points legacy color aliases at semantic roles", () => {
    for (const name of ["light", "dark"] as const) {
      expect(colors[name].text).toBe(colors[name].textPrimary);
      expect(colors[name].backgroundElement).toBe(colors[name].surfaceMuted);
      expect(colors[name].backgroundSelected).toBe(colors[name].borderStrong);
      expect(colors[name].background).toBe(semanticColors[name].background);
      expect(colors[name].primary).toBe(semanticColors[name].primary);
    }
  });

  it("keeps the 4pt scale and legacy spacing aliases", () => {
    expect(space[0]).toBe(0);
    expect(space[1]).toBe(4);
    expect(space[4]).toBe(16);
    expect(space[16]).toBe(64);
    expect(spacing.xs).toBe(space[1]);
    expect(spacing.sm).toBe(space[2]);
    expect(spacing.md).toBe(space[4]);
    expect(spacing.lg).toBe(space[6]);
    expect(spacing.xl).toBe(space[8]);
  });

  it("adds the new type scale without dropping legacy variants", () => {
    expect(typography.display.fontSize).toBe(34);
    expect(typography.h1.fontSize).toBe(28);
    expect(typography.h2.fontSize).toBe(22);
    expect(typography.h3.fontSize).toBe(18);
    expect(typography.overline.letterSpacing).toBe(0.6);
    // Legacy keys stay at their old metrics until the P4 alias removal;
    // `body` moved to the spec weight 400 at P3.1 (decision Q1).
    expect(typography.title.fontSize).toBe(48);
    expect(typography.subtitle.fontSize).toBe(32);
    expect(typography.body.fontWeight).toBe("400");
  });

  it("exposes every scale on the theme context", async () => {
    function wrapper({ children }: { children: ReactNode }) {
      return <ThemeProvider initialName="dark">{children}</ThemeProvider>;
    }
    const { result } = await renderHook(() => useTheme(), { wrapper });

    expect(result.current.name).toBe("dark");
    expect(result.current.color.primary).toBe(semanticColors.dark.primary);
    expect(result.current.space[4]).toBe(16);
    expect(result.current.radius.xl).toBe(24);
    expect(result.current.icon.lg).toBe(24);
    expect(result.current.elevation.card.android.elevation).toBe(1);
    expect(result.current.motion.base).toBe(200);
    expect(result.current.breakpoint.medium).toBe(600);
    expect(result.current.layout.feedMaxWidth).toBe(600);
  });

  it("keeps the aggregate `tokens` object complete", () => {
    expect(tokens.colors).toBe(colors);
    expect(tokens.space).toBe(space);
    expect(tokens.spacing).toBe(spacing);
    expect(tokens.typography).toBe(typography);
  });
});

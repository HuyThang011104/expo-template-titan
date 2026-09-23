/**
 * Design tokens — single source of truth.
 *
 * Colors reused from the template theme; no new palette.
 * All hex values live here; features use `useTheme()`, never hardcode.
 *
 * No `StyleSheet` or `Platform.select` here; push platform branches up.
 */

export const colors = {
  light: {
    text: "#000000",
    background: "#ffffff",
    backgroundElement: "#F0F0F3",
    backgroundSelected: "#E0E1E6",
    textSecondary: "#60646C",
    primary: "#3c87f7",
    onPrimary: "#ffffff",
    danger: "#ff3b30",
  },
  dark: {
    text: "#ffffff",
    background: "#000000",
    backgroundElement: "#212225",
    backgroundSelected: "#2E3135",
    textSecondary: "#B0B4BA",
    primary: "#3c87f7",
    onPrimary: "#ffffff",
    danger: "#ff5a52",
  },
} as const;

export type ThemeColorName = keyof typeof colors.light & keyof typeof colors.dark;

/**
 * Mapping from the legacy `Spacing` scale:
 * one(4) -> xs, two(8) -> sm, three(16) -> md, four(24) -> lg, five(32) -> xl.
 */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  full: 9999,
} as const;

export const typography = {
  title: { fontSize: 48, lineHeight: 52, fontWeight: "600" },
  subtitle: { fontSize: 32, lineHeight: 44, fontWeight: "600" },
  body: { fontSize: 16, lineHeight: 24, fontWeight: "500" },
  small: { fontSize: 14, lineHeight: 20, fontWeight: "500" },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: "500" },
} as const;

export type TypographyVariant = keyof typeof typography;

export type ThemeName = "light" | "dark";

export type Theme = {
  name: ThemeName;
  color: (typeof colors)[ThemeName];
  space: typeof spacing;
  radius: typeof radius;
  type: typeof typography;
};

export const tokens = {
  colors,
  spacing,
  radius,
  typography,
} as const;

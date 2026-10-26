/**
 * Primitive design scales — raw values only.
 *
 * Spec: docs/design-system.md §4. Do not import `palette` outside `theme/`;
 * features and entities use semantic roles via `useTheme()`.
 */

export type ThemeName = "light" | "dark";

export const palette = {
  brand: {
    50: "#EFF6FF",
    100: "#DBEAFE",
    200: "#BFDBFE",
    300: "#93C5FD",
    400: "#60A5FA",
    500: "#3C87F7", // brand gốc
    600: "#2A72DB",
    700: "#1F5FBF",
    800: "#1E4E96",
    900: "#1E3A6E",
  },
  neutral: {
    0: "#FFFFFF",
    25: "#FCFCFD",
    50: "#F7F8FA",
    100: "#F0F1F4",
    200: "#E3E5EA",
    300: "#D0D3DA",
    400: "#A7ACB6",
    500: "#7A808C",
    600: "#5C6270",
    700: "#444A56",
    800: "#2A2F39",
    900: "#171A21",
    950: "#0B0D12",
    1000: "#000000",
  },
  green: {
    50: "#ECFDF5",
    600: "#15803D",
    700: "#166534",
  },
  amber: {
    50: "#FFFBEB",
    600: "#B45309",
    700: "#92400E",
  },
  red: {
    50: "#FEF2F2",
    600: "#DC2626",
    700: "#B91C1C",
  },
} as const;

/** 4pt grid. `spacing` in `tokens.ts` keeps the legacy aliases. */
export const space = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
} as const;

export const radius = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

/**
 * `body` keeps the legacy 500 weight until the screen migration (P3) so P1
 * does not change typography app-wide. The spec target for `body` is 400.
 */
export const typography = {
  display: { fontSize: 34, lineHeight: 40, fontWeight: "700" },
  h1: { fontSize: 28, lineHeight: 34, fontWeight: "700" },
  h2: { fontSize: 22, lineHeight: 28, fontWeight: "600" },
  h3: { fontSize: 18, lineHeight: 24, fontWeight: "600" },
  body: { fontSize: 16, lineHeight: 24, fontWeight: "500" },
  bodyStrong: { fontSize: 16, lineHeight: 24, fontWeight: "600" },
  label: { fontSize: 14, lineHeight: 20, fontWeight: "500" },
  labelStrong: { fontSize: 14, lineHeight: 20, fontWeight: "600" },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: "500" },
  overline: { fontSize: 11, lineHeight: 16, fontWeight: "600", letterSpacing: 0.6 },
  // Legacy variants — @deprecated, remove when screens are migrated (P4).
  title: { fontSize: 48, lineHeight: 52, fontWeight: "600" },
  subtitle: { fontSize: 32, lineHeight: 44, fontWeight: "600" },
  small: { fontSize: 14, lineHeight: 20, fontWeight: "500" },
} as const;

export type TypographyVariant = keyof typeof typography;

export const iconSize = {
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
} as const;

export type IconSizeName = keyof typeof iconSize;

/** Platform split so components do not branch on `Platform` themselves. */
export const elevation = {
  none: {
    ios: { shadowColor: palette.neutral[1000], shadowOpacity: 0, shadowRadius: 0, shadowOffset: { width: 0, height: 0 } },
    android: { elevation: 0 },
  },
  card: {
    ios: { shadowColor: palette.neutral[1000], shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
    android: { elevation: 1 },
  },
  popover: {
    ios: { shadowColor: palette.neutral[1000], shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } },
    android: { elevation: 4 },
  },
  modal: {
    ios: { shadowColor: palette.neutral[1000], shadowOpacity: 0.18, shadowRadius: 24, shadowOffset: { width: 0, height: 12 } },
    android: { elevation: 8 },
  },
} as const;

/** Mutable tuples so Reanimated `Easing.bezier(...)` accepts them directly. */
type EasingCurve = [number, number, number, number];

const easing: Record<"standard" | "decelerate" | "accelerate", EasingCurve> = {
  standard: [0.2, 0, 0, 1],
  decelerate: [0, 0, 0, 1],
  accelerate: [0.3, 0, 1, 1],
};

export const motion = {
  instant: 0,
  fast: 150,
  base: 200,
  slow: 300,
  easing,
} as const;

export const breakpoint = {
  compact: 0,
  medium: 600,
  expanded: 900,
} as const;

export const layout = {
  contentMaxWidth: 640,
  feedMaxWidth: 600,
} as const;

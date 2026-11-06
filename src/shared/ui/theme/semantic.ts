/**
 * Semantic color roles — the only colors components may consume.
 *
 * Spec: docs/design-system.md §4.1.2. Both schemes must declare the same keys;
 * `SemanticColors` (via `satisfies`) makes a missing role a type error.
 */

import type { ThemeName } from "./primitive";

export type SemanticColorName =
  | "background"
  | "surface"
  | "surfaceElevated"
  | "surfaceSunken"
  | "surfaceMuted"
  | "border"
  | "borderStrong"
  | "textPrimary"
  | "textSecondary"
  | "textTertiary"
  | "textInverse"
  | "primary"
  | "primaryPressed"
  | "primarySoft"
  | "onPrimary"
  | "brand"
  | "success"
  | "successSoft"
  | "warning"
  | "warningSoft"
  | "danger"
  | "dangerSoft"
  | "onDanger"
  | "overlay"
  | "skeleton"
  | "focusRing";

export type SemanticColors = Record<SemanticColorName, string>;

export const semanticColors = {
  light: {
    background: "#FFFFFF",
    surface: "#FFFFFF",
    surfaceElevated: "#FFFFFF",
    surfaceSunken: "#F7F8FA",
    surfaceMuted: "#F0F1F4",
    border: "#E3E5EA",
    borderStrong: "#D0D3DA",
    textPrimary: "#0B0D12",
    textSecondary: "#5C6270",
    textTertiary: "#7A808C",
    textInverse: "#FFFFFF",
    primary: "#2A72DB",
    primaryPressed: "#1F5FBF",
    primarySoft: "#EFF6FF",
    onPrimary: "#FFFFFF",
    brand: "#3C87F7",
    success: "#15803D",
    successSoft: "#ECFDF5",
    warning: "#B45309",
    warningSoft: "#FFFBEB",
    danger: "#DC2626",
    dangerSoft: "#FEF2F2",
    onDanger: "#FFFFFF",
    overlay: "rgba(11,13,18,0.5)",
    skeleton: "#E3E5EA",
    focusRing: "#2A72DB",
  },
  dark: {
    background: "#000000",
    surface: "#121418",
    surfaceElevated: "#1A1D23",
    surfaceSunken: "#0B0D12",
    surfaceMuted: "#212225",
    border: "#2A2F39",
    borderStrong: "#3A404C",
    textPrimary: "#F7F8FA",
    textSecondary: "#A7ACB6",
    textTertiary: "#7A808C",
    textInverse: "#0B0D12",
    primary: "#6AA6FF",
    primaryPressed: "#4C93F9",
    primarySoft: "#10213D",
    onPrimary: "#08101F",
    brand: "#3C87F7",
    success: "#4ADE80",
    successSoft: "#052E1A",
    warning: "#FBBF24",
    warningSoft: "#3A2503",
    danger: "#F87171",
    dangerSoft: "#3A0B0B",
    onDanger: "#1A0505",
    overlay: "rgba(0,0,0,0.6)",
    skeleton: "#212225",
    focusRing: "#6AA6FF",
  },
} as const satisfies Record<ThemeName, SemanticColors>;

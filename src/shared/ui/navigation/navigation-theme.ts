/**
 * React Navigation theme derived from design tokens.
 *
 * Spec: docs/design-system.md §4.9. Spread the base theme so `fonts` and any
 * future fields React Navigation 7 requires stay intact.
 */

import { DarkTheme, DefaultTheme, type Theme as RouterTheme } from "expo-router";

import type { Theme } from "../theme/tokens";

export function navigationTheme(theme: Theme): RouterTheme {
  const base = theme.name === "dark" ? DarkTheme : DefaultTheme;

  return {
    ...base,
    dark: theme.name === "dark",
    colors: {
      ...base.colors,
      primary: theme.color.primary,
      background: theme.color.background,
      card: theme.color.surface,
      text: theme.color.textPrimary,
      border: theme.color.border,
      notification: theme.color.danger,
    },
  };
}

/**
 * Native header options factory.
 *
 * Spec: docs/design-system.md §7.4 (updated for SDK 57 prop names).
 * Pure function: call it from a layout component with `useTheme()`, never at
 * module scope.
 */

import type { NativeStackNavigationOptions } from "expo-router";
import type { ReactNode } from "react";

import type { Theme, ThemeColorName } from "../theme/tokens";

export type HeaderOptionsArgs = {
  title?: string;
  large?: boolean;
  right?: () => ReactNode;
  tint?: ThemeColorName;
};

export function headerOptions(
  theme: Theme,
  options: HeaderOptionsArgs = {},
): NativeStackNavigationOptions {
  return {
    title: options.title,
    headerLargeTitleEnabled: options.large ?? false,
    headerTintColor: theme.color[options.tint ?? "primary"],
    headerStyle: { backgroundColor: theme.color.surface },
    headerTitleStyle: {
      color: theme.color.textPrimary,
      fontSize: 17,
      fontWeight: "600",
    },
    headerShadowVisible: false,
    headerBackButtonDisplayMode: "minimal",
    headerRight: options.right,
  };
}

/**
 * Design tokens — public token surface.
 *
 * Spec: docs/design-system.md §4.
 * Raw values live in `primitive.ts` + `semantic.ts`; this file re-exports them
 * and keeps the legacy aliases so screens migrate one at a time.
 *
 * No `StyleSheet` or `Platform.select` here; platform branches (elevation)
 * are data, resolved by components.
 */

import {
  breakpoint,
  elevation,
  iconSize,
  layout,
  motion,
  radius,
  space,
  typography,
  type IconSizeName,
  type ThemeName,
  type TypographyVariant,
} from "./primitive";
import { semanticColors, type SemanticColors } from "./semantic";

export {
  breakpoint,
  elevation,
  iconSize,
  layout,
  motion,
  radius,
  space,
  typography,
};
export type { IconSizeName, ThemeName, TypographyVariant };

/**
 * Legacy spacing aliases. Numbers stay available as `space[4]`; the named
 * keys keep existing layouts working until they are migrated.
 */
export const spacing = {
  ...space,
  xs: space[1],
  sm: space[2],
  md: space[4],
  lg: space[6],
  xl: space[8],
} as const;

/**
 * Legacy color aliases (spec Appendix A). `text`, `backgroundElement` and
 * `backgroundSelected` are the only roles that changed name; the rest already
 * match their semantic key. @deprecated — use the semantic role.
 */
function withLegacyAliases<T extends SemanticColors>(scheme: T) {
  return {
    ...scheme,
    text: scheme.textPrimary,
    backgroundElement: scheme.surfaceMuted,
    backgroundSelected: scheme.borderStrong,
  };
}

export const colors = {
  light: withLegacyAliases(semanticColors.light),
  dark: withLegacyAliases(semanticColors.dark),
} as const;

export type ThemeColorName = keyof (typeof colors)["light"] & keyof (typeof colors)["dark"];

export type Theme = {
  name: ThemeName;
  color: (typeof colors)[ThemeName];
  space: typeof spacing;
  radius: typeof radius;
  type: typeof typography;
  icon: typeof iconSize;
  elevation: typeof elevation;
  motion: typeof motion;
  breakpoint: typeof breakpoint;
  layout: typeof layout;
};

export type { SemanticColorName } from "./semantic";

export const tokens = {
  colors,
  space,
  spacing,
  radius,
  typography,
  iconSize,
  elevation,
  motion,
  breakpoint,
  layout,
} as const;

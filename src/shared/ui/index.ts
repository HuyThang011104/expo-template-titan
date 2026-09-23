// Public API of `src/shared/ui`.
// Tokens + primitives are the canonical path.
// `ThemedText`/`ThemedView` stay for legacy imports — @deprecated, remove later.
export { ThemedText, type ThemedTextProps } from "./themed-text";
export { ThemedView, type ThemedViewProps } from "./themed-view";

export { ThemeProvider, useThemeName } from "./theme/theme-provider";
export { useTheme } from "./theme/use-theme";
export {
  colors,
  radius,
  spacing,
  tokens,
  typography,
  type Theme,
  type ThemeColorName,
  type ThemeName,
  type TypographyVariant,
} from "./theme/tokens";
export { Button, type ButtonProps, type ButtonSize, type ButtonVariant } from "./button";
export { ErrorScreen, type ErrorScreenProps } from "./error-screen";
export { ExternalLink } from "./external-link";
export { Input, type InputProps } from "./input";
export { AppList, type AppListProps } from "./list";
export { Screen, type ScreenProps } from "./screen";
export { Sheet, type SheetProps } from "./sheet";
export { Text, type TextComponentProps, type TextVariant } from "./text";

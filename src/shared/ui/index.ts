// Public API of `src/shared/ui`.
// Tokens + primitives are the canonical path.
// `ThemedText`/`ThemedView` stay for legacy imports — @deprecated, remove later.
export { ThemedText, type ThemedTextProps } from "./themed-text";
export { ThemedView, type ThemedViewProps } from "./themed-view";

export { ThemeProvider, useThemeName } from "./theme/theme-provider";
export {
  ThemePreferenceProvider,
  useThemePreference,
  type ThemePreference,
} from "./theme/theme-preference";
export { useTheme } from "./theme/use-theme";
export {
  breakpoint,
  colors,
  elevation,
  iconSize,
  layout,
  motion,
  radius,
  space,
  spacing,
  tokens,
  typography,
  type IconSizeName,
  type RadiusName,
  type SemanticColorName,
  type SpaceName,
  type Theme,
  type ThemeColorName,
  type ThemeName,
  type TypographyVariant,
} from "./theme/tokens";
export {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Field,
  IconButton,
  Input,
  ListItem,
  LoadingState,
  Tabs,
  TextArea,
  type AvatarProps,
  type AvatarSize,
  type BadgeProps,
  type BadgeTone,
  type ButtonIconPosition,
  type ButtonProps,
  type ButtonSize,
  type ButtonVariant,
  type CardProps,
  type EmptyStateProps,
  type ErrorStateProps,
  type FieldProps,
  type IconButtonProps,
  type IconButtonSize,
  type IconButtonVariant,
  type InputProps,
  type ListItemProps,
  type LoadingStateProps,
  type LoadingStateVariant,
  type TabItem,
  type TabsProps,
  type TabsVariant,
  type TextAreaProps,
} from "./components";
export { ErrorScreen, type ErrorScreenProps } from "./error-screen";
export { ExternalLink } from "./external-link";
export { Icon, iconMap, iconNames, type IconName, type IconProps } from "./icons";
export { AppList, type AppListProps } from "./list";
export { Screen, type ScreenProps } from "./screen";
export {
  Box,
  Column,
  Divider,
  Pressable,
  Row,
  Skeleton,
  Spinner,
  Stack,
  type BoxProps,
  type DividerProps,
  type PressableProps,
  type RowProps,
  type SkeletonProps,
  type SpinnerProps,
  type SpinnerSize,
  type StackProps,
} from "./primitives";
export { Sheet, type SheetProps } from "./sheet";
export { Text, type TextComponentProps, type TextVariant } from "./text";

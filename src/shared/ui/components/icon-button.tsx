import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";

import { Icon, type IconName } from "../icons";
import { Pressable } from "../primitives";
import { useTheme } from "../theme/use-theme";

export type IconButtonVariant = "ghost" | "primary" | "secondary" | "danger";
export type IconButtonSize = "sm" | "md" | "lg";

export type IconButtonProps = {
  icon: IconName;
  /** Required: the icon is the only visible content. */
  accessibilityLabel: string;
  size?: IconButtonSize;
  variant?: IconButtonVariant;
  disabled?: boolean;
  hitSlop?: number;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

const containerSize: Record<IconButtonSize, number> = {
  sm: 36,
  md: 44,
  lg: 52,
};

/**
 * Square icon-only button. `sm` adds hit slop so the touch target still
 * reaches the 44×44 minimum.
 */
export function IconButton({
  icon,
  accessibilityLabel,
  size = "md",
  variant = "ghost",
  disabled = false,
  hitSlop,
  onPress,
  style,
  testID,
}: IconButtonProps) {
  const theme = useTheme();

  const backgroundColor = {
    ghost: "transparent",
    primary: theme.color.primary,
    secondary: theme.color.surfaceMuted,
    danger: theme.color.danger,
  }[variant];

  const iconColor =
    variant === "primary"
      ? "onPrimary"
      : variant === "danger"
        ? "onDanger"
        : variant === "ghost"
          ? "primary"
          : "textPrimary";

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      hitSlop={hitSlop ?? (size === "sm" ? theme.space[1] : undefined)}
      style={[
        styles.base,
        {
          width: containerSize[size],
          height: containerSize[size],
          borderRadius: theme.radius.md,
          backgroundColor,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      <Icon name={icon} size={size} color={iconColor} decorative />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
  },
});

import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { Icon, type IconName } from "../icons";
import { Pressable, Spinner } from "../primitives";
import { Text } from "../text";
import { useTheme } from "../theme/use-theme";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";
export type ButtonIconPosition = "left" | "right";

export type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  iconPosition?: ButtonIconPosition;
  fullWidth?: boolean;
  disabled?: boolean;
  loading?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * Token-based button. Loading keeps the label in the tree (transparent) and
 * overlays a spinner, so the button never changes size while pending.
 */
export function Button({
  title,
  onPress,
  variant = "primary",
  size = "md",
  icon,
  iconPosition = "left",
  fullWidth = false,
  disabled = false,
  loading = false,
  accessibilityLabel,
  style,
  testID,
}: ButtonProps) {
  const theme = useTheme();
  const inactive = disabled || loading;

  const palette = {
    primary: { background: theme.color.primary, foreground: theme.color.onPrimary },
    secondary: { background: theme.color.surfaceMuted, foreground: theme.color.textPrimary },
    outline: { background: "transparent", foreground: theme.color.textPrimary },
    ghost: { background: "transparent", foreground: theme.color.primary },
    danger: { background: theme.color.danger, foreground: theme.color.onDanger },
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
      disabled={inactive}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={[
        styles.base,
        sizeStyles[size],
        {
          backgroundColor: palette.background,
          borderRadius: theme.radius.md,
          borderWidth: variant === "outline" ? 1 : 0,
          borderColor: variant === "outline" ? theme.color.border : undefined,
          opacity: inactive ? 0.6 : 1,
        },
        fullWidth && styles.fullWidth,
        style,
      ]}
    >
      <View style={[styles.content, loading && styles.hidden]}>
        {icon && iconPosition === "left" ? (
          <Icon name={icon} size="md" color={iconColor} decorative />
        ) : null}
        <Text variant="labelStrong" style={{ color: palette.foreground }}>
          {title}
        </Text>
        {icon && iconPosition === "right" ? (
          <Icon name={icon} size="md" color={iconColor} decorative />
        ) : null}
      </View>
      {loading ? (
        <View pointerEvents="none" style={styles.spinner}>
          <Spinner size="sm" color={iconColor} />
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  hidden: {
    opacity: 0,
  },
  fullWidth: {
    width: "100%",
  },
  spinner: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
  },
});

const sizeStyles = StyleSheet.create({
  sm: {
    minHeight: 36,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  md: {
    minHeight: 44,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  lg: {
    minHeight: 52,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
});

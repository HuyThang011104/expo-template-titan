import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { Text } from "./text";
import { useTheme } from "./theme/use-theme";

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "sm" | "md";

export type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * Token-based button. Press dims via opacity; disabled/loading dims + locks.
 */
export function Button({
  title,
  onPress,
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  style,
  testID,
}: ButtonProps) {
  const theme = useTheme();
  const inactive = disabled || loading;

  const backgroundColor =
    variant === "primary"
      ? theme.color.primary
      : variant === "secondary"
        ? theme.color.backgroundElement
        : "transparent";

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        size === "sm" ? styles.sm : styles.md,
        {
          backgroundColor,
          borderRadius: theme.radius.md,
          opacity: pressed || inactive ? 0.6 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === "primary" ? theme.color.onPrimary : theme.color.primary}
        />
      ) : (
        <Text
          variant="small"
          style={{
            color:
              variant === "primary"
                ? theme.color.onPrimary
                : variant === "secondary"
                  ? theme.color.text
                  : theme.color.primary,
            fontWeight: "700",
            textAlign: "center",
          }}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
  },
  sm: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    minHeight: 36,
  },
  md: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 44,
  },
});

import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { Text } from "../text";
import type { ThemeColorName } from "../theme/tokens";
import { useTheme } from "../theme/use-theme";

export type BadgeTone = "primary" | "danger" | "neutral";

type BadgeBaseProps = {
  tone?: BadgeTone;
  testID?: string;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

export type BadgeProps = BadgeBaseProps &
  (
    | { variant?: "count"; count: number; max?: number }
    | { variant: "dot"; count?: never; max?: never }
  );

const toneColors: Record<
  BadgeTone,
  { background: ThemeColorName; foreground: ThemeColorName }
> = {
  primary: { background: "primary", foreground: "onPrimary" },
  danger: { background: "danger", foreground: "onDanger" },
  neutral: { background: "surfaceMuted", foreground: "textSecondary" },
};

export function Badge(props: BadgeProps) {
  const theme = useTheme();
  const { tone = "primary", testID, accessibilityLabel, style } = props;
  const palette = toneColors[tone];

  if (props.variant === "dot") {
    return (
      <View
        testID={testID}
        accessible={accessibilityLabel !== undefined}
        accessibilityLabel={accessibilityLabel}
        accessibilityElementsHidden={accessibilityLabel === undefined}
        importantForAccessibility={
          accessibilityLabel === undefined ? "no-hide-descendants" : "auto"
        }
        style={[
          styles.dot,
          {
            backgroundColor: theme.color[palette.background],
            borderRadius: theme.radius.full,
          },
          style,
        ]}
      />
    );
  }

  const { count, max = 99 } = props;
  const value = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
  const cap = Number.isFinite(max) ? Math.max(0, Math.floor(max)) : 99;
  const display = value > cap ? `${cap}+` : String(value);

  return (
    <View
      testID={testID}
      accessible
      accessibilityLabel={accessibilityLabel ?? display}
      style={[
        styles.count,
        {
          backgroundColor: theme.color[palette.background],
          borderRadius: theme.radius.full,
        },
        style,
      ]}
    >
      <Text
        variant="caption"
        color={palette.foreground}
        accessible={false}
        style={styles.countText}
      >
        {display}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  dot: {
    width: 8,
    height: 8,
  },
  count: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  countText: {
    fontWeight: "600",
    textAlign: "center",
  },
});

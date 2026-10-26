import type { ReactNode } from "react";
import {
  Platform,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { Pressable } from "../primitives";
import type { SpaceName } from "../theme/tokens";
import { useTheme } from "../theme/use-theme";

export type CardProps = {
  children: ReactNode;
  onPress?: () => void;
  padding?: SpaceName;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function Card({
  children,
  onPress,
  padding = 4,
  accessibilityLabel,
  style,
  testID,
}: CardProps) {
  const theme = useTheme();
  const dark = theme.name === "dark";
  const elevationStyle = dark
    ? undefined
    : Platform.OS === "ios"
      ? theme.elevation.card.ios
      : Platform.OS === "android"
        ? theme.elevation.card.android
        : undefined;

  const contentStyle = [
    styles.base,
    {
      backgroundColor: dark ? theme.color.surfaceElevated : theme.color.surface,
      borderColor: theme.color.border,
      borderRadius: theme.radius.lg,
      padding: theme.space[padding],
    },
    elevationStyle,
    style,
  ];

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={contentStyle}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View testID={testID} style={contentStyle}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
  },
});

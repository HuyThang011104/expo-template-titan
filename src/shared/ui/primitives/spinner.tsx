import {
  ActivityIndicator,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import type { ThemeColorName } from "../theme/tokens";
import { useTheme } from "../theme/use-theme";

export type SpinnerSize = "sm" | "md" | "lg";

export type SpinnerProps = {
  size?: SpinnerSize;
  color?: ThemeColorName;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function Spinner({
  size = "md",
  color = "textSecondary",
  accessibilityLabel,
  style,
  testID,
}: SpinnerProps) {
  const theme = useTheme();

  return (
    <ActivityIndicator
      size={size === "sm" ? "small" : "large"}
      color={theme.color[color]}
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessible={accessibilityLabel !== undefined}
      style={style}
      testID={testID}
    />
  );
}

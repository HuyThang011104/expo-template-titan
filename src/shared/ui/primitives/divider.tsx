import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import type { SpaceName, ThemeColorName } from "../theme/tokens";
import { useTheme } from "../theme/use-theme";

export type DividerProps = {
  orientation?: "horizontal" | "vertical";
  /** Inset along the line's cross axis (horizontal margin or vertical margin). */
  inset?: SpaceName;
  color?: ThemeColorName;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function Divider({
  orientation = "horizontal",
  inset,
  color = "border",
  style,
  testID,
}: DividerProps) {
  const theme = useTheme();
  const horizontal = orientation === "horizontal";

  return (
    <View
      testID={testID}
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={[
        {
          backgroundColor: theme.color[color],
          alignSelf: "stretch",
          height: horizontal ? StyleSheet.hairlineWidth : undefined,
          width: horizontal ? undefined : StyleSheet.hairlineWidth,
          marginHorizontal: horizontal && inset !== undefined ? theme.space[inset] : undefined,
          marginVertical: !horizontal && inset !== undefined ? theme.space[inset] : undefined,
        },
        style,
      ]}
    />
  );
}

import { SymbolView } from "expo-symbols";
import { useEffect } from "react";
import type { StyleProp, ViewStyle } from "react-native";

import type { IconSizeName, ThemeColorName } from "../theme/tokens";
import { useTheme } from "../theme/use-theme";
import { iconMap, type IconName } from "./icon-map";

export type IconProps = {
  name: IconName;
  size?: IconSizeName;
  color?: ThemeColorName;
  /** Required when the icon is the only content of a control. */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * Cross-platform icon. Defaults to `lg` (24) and `textSecondary`; icon-only
 * controls must pass `accessibilityLabel`.
 */
export function Icon({
  name,
  size = "lg",
  color = "textSecondary",
  accessibilityLabel,
  style,
}: IconProps) {
  const theme = useTheme();

  useEffect(() => {
    if (__DEV__ && accessibilityLabel === undefined) {
      console.warn(
        `[Icon] "${name}" is missing accessibilityLabel. Add one when the icon is the only content of a control.`,
      );
    }
  }, [accessibilityLabel, name]);

  const symbol = iconMap[name];

  return (
    <SymbolView
      name={{ ios: symbol.ios, android: symbol.android, web: symbol.web }}
      size={theme.icon[size]}
      tintColor={theme.color[color]}
      accessibilityLabel={accessibilityLabel}
      accessible={accessibilityLabel !== undefined}
      style={style}
    />
  );
}

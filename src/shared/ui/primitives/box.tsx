import { View, type ViewProps } from "react-native";

import type { RadiusName, SpaceName, ThemeColorName } from "../theme/tokens";
import { useTheme } from "../theme/use-theme";

export type BoxProps = ViewProps & {
  padding?: SpaceName;
  paddingHorizontal?: SpaceName;
  paddingVertical?: SpaceName;
  paddingTop?: SpaceName;
  paddingRight?: SpaceName;
  paddingBottom?: SpaceName;
  paddingLeft?: SpaceName;
  margin?: SpaceName;
  marginHorizontal?: SpaceName;
  marginVertical?: SpaceName;
  marginTop?: SpaceName;
  marginRight?: SpaceName;
  marginBottom?: SpaceName;
  marginLeft?: SpaceName;
  gap?: SpaceName;
  background?: ThemeColorName;
  radius?: RadiusName;
  borderColor?: ThemeColorName;
  borderWidth?: number;
};

/**
 * View with token-only spacing. Numeric `space` keys are the only accepted
 * values; the component never takes raw pixel spacing.
 */
export function Box({
  padding,
  paddingHorizontal,
  paddingVertical,
  paddingTop,
  paddingRight,
  paddingBottom,
  paddingLeft,
  margin,
  marginHorizontal,
  marginVertical,
  marginTop,
  marginRight,
  marginBottom,
  marginLeft,
  gap,
  background,
  radius,
  borderColor,
  borderWidth,
  style,
  ...rest
}: BoxProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        {
          padding: padding !== undefined ? theme.space[padding] : undefined,
          paddingHorizontal:
            paddingHorizontal !== undefined ? theme.space[paddingHorizontal] : undefined,
          paddingVertical:
            paddingVertical !== undefined ? theme.space[paddingVertical] : undefined,
          paddingTop: paddingTop !== undefined ? theme.space[paddingTop] : undefined,
          paddingRight: paddingRight !== undefined ? theme.space[paddingRight] : undefined,
          paddingBottom: paddingBottom !== undefined ? theme.space[paddingBottom] : undefined,
          paddingLeft: paddingLeft !== undefined ? theme.space[paddingLeft] : undefined,
          margin: margin !== undefined ? theme.space[margin] : undefined,
          marginHorizontal:
            marginHorizontal !== undefined ? theme.space[marginHorizontal] : undefined,
          marginVertical: marginVertical !== undefined ? theme.space[marginVertical] : undefined,
          marginTop: marginTop !== undefined ? theme.space[marginTop] : undefined,
          marginRight: marginRight !== undefined ? theme.space[marginRight] : undefined,
          marginBottom: marginBottom !== undefined ? theme.space[marginBottom] : undefined,
          marginLeft: marginLeft !== undefined ? theme.space[marginLeft] : undefined,
          gap: gap !== undefined ? theme.space[gap] : undefined,
          backgroundColor: background !== undefined ? theme.color[background] : undefined,
          borderRadius: radius !== undefined ? theme.radius[radius] : undefined,
          borderColor: borderColor !== undefined ? theme.color[borderColor] : undefined,
          borderWidth,
        },
        style,
      ]}
      {...rest}
    />
  );
}

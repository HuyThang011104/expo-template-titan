import { Text as RNText, type StyleProp, type TextProps, type TextStyle } from "react-native";

import type { ThemeColorName, TypographyVariant } from "./theme/tokens";
import { useTheme } from "./theme/use-theme";

export type TextVariant = TypographyVariant | "link";

export type TextComponentProps = TextProps & {
  variant?: TextVariant;
  color?: ThemeColorName;
  style?: StyleProp<TextStyle>;
};

/**
 * Token-based text. `link` is body typography in the primary color.
 * Legacy `smallBold` maps to `small` with weight 700.
 */
export function Text({ variant = "body", color, style, ...rest }: TextComponentProps) {
  const theme = useTheme();

  const base = variant === "link" ? theme.type.body : theme.type[variant];
  const textColor =
    color !== undefined
      ? theme.color[color]
      : variant === "link"
        ? theme.color.primary
        : theme.color.text;

  return (
    <RNText
      style={[
        {
          color: textColor,
          fontSize: base.fontSize,
          lineHeight: base.lineHeight,
          fontWeight: base.fontWeight as TextStyle["fontWeight"],
        },
        style,
      ]}
      {...rest}
    />
  );
}

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
 * New variants (`display`…`overline`) are the canonical scale; the legacy
 * `title`/`subtitle`/`small` variants keep their old metrics until P3.
 */
export function Text({ variant = "body", color, style, ...rest }: TextComponentProps) {
  const theme = useTheme();

  const base = variant === "link" ? theme.type.body : theme.type[variant];
  const textColor =
    color !== undefined
      ? theme.color[color]
      : variant === "link"
        ? theme.color.primary
        : theme.color.textPrimary;

  return (
    <RNText
      style={[
        {
          color: textColor,
          fontSize: base.fontSize,
          lineHeight: base.lineHeight,
          fontWeight: base.fontWeight as TextStyle["fontWeight"],
          letterSpacing: "letterSpacing" in base ? base.letterSpacing : undefined,
        },
        style,
      ]}
      {...rest}
    />
  );
}

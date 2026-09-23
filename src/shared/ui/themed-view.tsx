import { View, type ViewProps } from 'react-native';

import { useTheme } from "./theme/use-theme";
import type { ThemeColorName } from "./theme/tokens";

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
  type?: ThemeColorName;
};

export function ThemedView({ style, lightColor, darkColor, type, ...otherProps }: ThemedViewProps) {
  const theme = useTheme();

  return <View style={[{ backgroundColor: theme.color[type ?? 'background'] }, style]} {...otherProps} />;
}

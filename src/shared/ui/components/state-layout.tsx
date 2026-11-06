import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { Icon, type IconName } from "../icons";
import { Text } from "../text";
import type { ThemeColorName } from "../theme/tokens";
import { useTheme } from "../theme/use-theme";

export type StateLayoutProps = {
  icon: IconName;
  iconColor: ThemeColorName;
  iconBackground: ThemeColorName;
  title: string;
  description?: string;
  accessibilityLabel?: string;
  action?: ReactNode;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

export function StateLayout({
  icon,
  iconColor,
  iconBackground,
  title,
  description,
  accessibilityLabel,
  action,
  testID,
  style,
}: StateLayoutProps) {
  const theme = useTheme();

  return (
    <View testID={testID} style={[styles.container, style]}>
      <View
        style={[
          styles.icon,
          {
            backgroundColor: theme.color[iconBackground],
            borderRadius: theme.radius.full,
          },
        ]}
      >
        <Icon name={icon} size="xl" color={iconColor} decorative />
      </View>
      <Text
        variant="h3"
        accessibilityRole="header"
        accessibilityLabel={accessibilityLabel ?? title}
        style={styles.title}
      >
        {title}
      </Text>
      {description ? (
        <Text variant="body" color="textSecondary" style={styles.description}>
          {description}
        </Text>
      ) : null}
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 32,
    gap: 8,
  },
  icon: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    textAlign: "center",
  },
  description: {
    textAlign: "center",
    maxWidth: 320,
  },
  action: {
    marginTop: 8,
  },
});

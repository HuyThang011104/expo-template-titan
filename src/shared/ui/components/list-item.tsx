import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { Pressable } from "../primitives";
import { Text } from "../text";
import { useTheme } from "../theme/use-theme";

export type ListItemProps = {
  title: string;
  subtitle?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function ListItem({
  title,
  subtitle,
  leading,
  trailing,
  onPress,
  disabled = false,
  accessibilityLabel,
  style,
  testID,
}: ListItemProps) {
  const theme = useTheme();
  const label = accessibilityLabel ?? [title, subtitle].filter(Boolean).join(", ");

  const content = (
    <>
      {leading ? <View style={styles.leading}>{leading}</View> : null}
      <View style={styles.text}>
        <Text variant="body" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" color="textSecondary" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
    </>
  );

  const contentStyle = [
    styles.base,
    {
      paddingHorizontal: theme.space[4],
      paddingVertical: theme.space[2],
      gap: theme.space[3],
    },
    style,
  ];

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled }}
        style={[contentStyle, disabled && styles.disabled]}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View testID={testID} style={contentStyle}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
  },
  text: {
    flex: 1,
  },
  leading: {
    justifyContent: "center",
  },
  trailing: {
    justifyContent: "center",
  },
  disabled: {
    opacity: 0.5,
  },
});

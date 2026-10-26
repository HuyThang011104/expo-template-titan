import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { Pressable } from "../primitives";
import { Text } from "../text";
import { useTheme } from "../theme/use-theme";

export type TabsVariant = "underline" | "segmented";

export type TabItem = {
  key: string;
  label: string;
  accessibilityLabel?: string;
  testID?: string;
};

export type TabsProps = {
  items: readonly TabItem[];
  value: string;
  onChange: (key: string) => void;
  variant?: TabsVariant;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function Tabs({
  items,
  value,
  onChange,
  variant = "underline",
  accessibilityLabel,
  style,
  testID,
}: TabsProps) {
  const theme = useTheme();
  const segmented = variant === "segmented";

  return (
    <View
      testID={testID}
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.base,
        segmented
          ? [
              styles.segmented,
              {
                backgroundColor: theme.color.surfaceMuted,
                borderRadius: theme.radius.md,
                padding: theme.space[1],
              },
            ]
          : [
              styles.underline,
              {
                borderBottomColor: theme.color.border,
                gap: theme.space[6],
                paddingHorizontal: theme.space[4],
              },
            ],
        style,
      ]}
    >
      {items.map((item) => {
        const selected = item.key === value;

        return (
          <Pressable
            key={item.key}
            testID={item.testID}
            onPress={() => {
              onChange(item.key);
            }}
            accessibilityRole="tab"
            accessibilityLabel={item.accessibilityLabel ?? item.label}
            accessibilityState={{ selected }}
            style={[
              styles.tab,
              segmented
                ? [
                    styles.segmentedTab,
                    { borderRadius: theme.radius.sm },
                    selected && { backgroundColor: theme.color.surface },
                  ]
                : [
                    styles.underlineTab,
                    {
                      borderBottomColor: selected
                        ? theme.color.primary
                        : "transparent",
                    },
                  ],
            ]}
          >
            <Text
              variant={selected ? "labelStrong" : "label"}
              color={selected ? "textPrimary" : "textSecondary"}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
  },
  underline: {
    borderBottomWidth: 1,
  },
  segmented: {
    alignItems: "center",
  },
  tab: {
    alignItems: "center",
    justifyContent: "center",
  },
  underlineTab: {
    minHeight: 44,
    borderBottomWidth: 2,
  },
  segmentedTab: {
    flex: 1,
    minHeight: 44,
  },
});

/**
 * Notification pref toggle row (G2.3).
 *
 * Presentational: label + description + platform `Switch`. The screen owns
 * the mutation; a pending toggle locks only its own row.
 */

import { StyleSheet, Switch, View } from "react-native";

import { Text } from "@/shared/ui";

export type PrefToggleRowProps = {
  title: string;
  description: string;
  value: boolean;
  pending: boolean;
  testID: string;
  onToggle: (next: boolean) => void;
};

export function PrefToggleRow({
  title,
  description,
  value,
  pending,
  testID,
  onToggle,
}: PrefToggleRowProps) {
  return (
    <View style={styles.row} testID={testID}>
      <View style={styles.texts}>
        <Text variant="small" style={styles.title}>
          {title}
        </Text>
        <Text variant="caption" color="textSecondary">
          {description}
        </Text>
      </View>
      <Switch
        testID={`${testID}-switch`}
        accessibilityLabel={title}
        value={value}
        disabled={pending}
        onValueChange={onToggle}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  texts: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontWeight: "700",
  },
});

/**
 * Audience option group (G2.3 privacy).
 *
 * Presentational radio list: title + options, selected marked with ●.
 * The screen owns the mutation; a pending save locks the whole group.
 */

import { Pressable, StyleSheet, View } from "react-native";

import { Text } from "@/shared/ui";

export type AudienceOption<T extends string> = {
  value: T;
  label: string;
  description?: string;
};

export type AudienceOptionGroupProps<T extends string> = {
  title: string;
  options: AudienceOption<T>[];
  selected: T;
  pending: boolean;
  testID: string;
  onSelect: (value: T) => void;
};

export function AudienceOptionGroup<T extends string>({
  title,
  options,
  selected,
  pending,
  testID,
  onSelect,
}: AudienceOptionGroupProps<T>) {
  return (
    <View style={styles.group} testID={testID}>
      <Text variant="small" style={styles.title}>
        {title}
      </Text>
      {options.map((option) => {
        const active = option.value === selected;
        return (
          <Pressable
            key={option.value}
            testID={`${testID}-option-${option.value}`}
            accessibilityRole="radio"
            accessibilityState={{ selected: active, disabled: pending }}
            disabled={pending}
            onPress={() => {
              if (!active) onSelect(option.value);
            }}
            style={styles.option}
          >
            <Text variant="body" style={active ? styles.activeDot : styles.dot}>
              {active ? "●" : "○"}
            </Text>
            <View style={styles.texts}>
              <Text variant="body" style={active ? styles.activeLabel : undefined}>
                {option.label}
              </Text>
              {option.description ? (
                <Text variant="caption" color="textSecondary">
                  {option.description}
                </Text>
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    fontWeight: "700",
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
  },
  dot: {
    fontWeight: "400",
  },
  activeDot: {
    fontWeight: "700",
  },
  activeLabel: {
    fontWeight: "700",
  },
  texts: {
    flex: 1,
    gap: 2,
  },
});

/**
 * Audience option group (G2.3 privacy).
 *
 * Presentational radio list: title + options, selected marked with ●.
 * The screen owns the mutation; a pending save locks the whole group.
 */

import { Pressable, StyleSheet, View } from "react-native";

import { Icon, Text } from "@/shared/ui";

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
      <Text variant="labelStrong" color="textSecondary">
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
            <View style={styles.radio}>
              {active ? <Icon name="check" size="sm" color="primary" /> : null}
            </View>
            <View style={styles.texts}>
              <Text variant={active ? "labelStrong" : "body"}>{option.label}</Text>
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
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
  },
  radio: {
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  texts: {
    flex: 1,
    gap: 2,
  },
});

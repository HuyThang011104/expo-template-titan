/**
 * Search bar (F3).
 *
 * Thin wrapper over shared `Input` with a clear action.
 */

import { StyleSheet, View } from "react-native";

import { Button, Input } from "@/shared/ui";

export type SearchBarProps = {
  value: string;
  onChangeText: (text: string) => void;
  onClear: () => void;
};

export function SearchBar({ value, onChangeText, onClear }: SearchBarProps) {
  return (
    <View style={styles.root}>
      <View style={styles.inputFlex}>
        <Input
          value={value}
          onChangeText={onChangeText}
          placeholder="Search posts and people"
          autoCapitalize="none"
          returnKeyType="search"
          testID="search-input"
          accessibilityLabel="Search posts and people"
        />
      </View>
      {value.length > 0 ? (
        <Button
          title="Clear"
          variant="secondary"
          size="sm"
          testID="search-clear-button"
          onPress={onClear}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  inputFlex: {
    flex: 1,
  },
});

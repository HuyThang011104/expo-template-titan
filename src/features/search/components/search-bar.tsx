/**
 * Search bar (F3, Android/web).
 *
 * Pill field on `surfaceSunken` with a leading search glyph and an in-field
 * clear `IconButton`. iOS uses the native header search bar instead.
 */

import { StyleSheet, TextInput, View } from "react-native";

import { Icon, IconButton, useTheme } from "@/shared/ui";

export type SearchBarProps = {
  value: string;
  onChangeText: (text: string) => void;
  onClear: () => void;
  /** G2.2: fired on keyboard submit so the query is saved to history. */
  onSubmit?: () => void;
};

export function SearchBar({ value, onChangeText, onClear, onSubmit }: SearchBarProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.root,
        {
          paddingHorizontal: theme.space[4],
          paddingVertical: theme.space[2],
        },
      ]}
    >
      <View
        style={[
          styles.field,
          {
            backgroundColor: theme.color.surfaceSunken,
            borderRadius: theme.radius.full,
            paddingLeft: theme.space[3],
            paddingRight: theme.space[1],
            gap: theme.space[2],
          },
        ]}
      >
        <Icon name="search" size="md" color="textTertiary" decorative />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder="Search posts and people"
          placeholderTextColor={theme.color.textTertiary}
          autoCapitalize="none"
          returnKeyType="search"
          testID="search-input"
          accessibilityLabel="Search posts and people"
          onSubmitEditing={onSubmit}
          style={[
            styles.input,
            theme.type.body,
            {
              color: theme.color.textPrimary,
              paddingVertical: theme.space[2],
            },
          ]}
        />
        {value.length > 0 ? (
          <IconButton
            icon="close"
            size="sm"
            variant="ghost"
            accessibilityLabel="Clear search"
            testID="search-clear-button"
            onPress={onClear}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: "row",
    alignItems: "center",
  },
  field: {
    flex: 1,
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    flex: 1,
    minHeight: 44,
    paddingHorizontal: 0,
  },
});

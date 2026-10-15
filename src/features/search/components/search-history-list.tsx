/**
 * Search history list (G2.2).
 *
 * Local per-user history: tap refills the query, per-row ✕ deletes one,
 * "Xóa hết" clears all. Pure presentational — state lives in
 * `useSearchHistory`, persistence in the kv-backed store.
 */

import { Pressable, StyleSheet, View } from "react-native";

import { Button, Text } from "@/shared/ui";

export type SearchHistoryListProps = {
  history: string[];
  onSelect: (query: string) => void;
  onRemoveOne: (query: string) => void;
  onClearAll: () => void;
};

export function SearchHistoryList({ history, onSelect, onRemoveOne, onClearAll }: SearchHistoryListProps) {
  if (history.length === 0) return null;
  return (
    <View style={styles.root} testID="search-history-list">
      <View style={styles.header}>
        <Text variant="small" style={styles.title}>
          Lịch sử
        </Text>
        <Button
          title="Xóa hết"
          variant="ghost"
          size="sm"
          testID="search-history-clear-button"
          onPress={onClearAll}
        />
      </View>
      {history.map((item) => (
        <View key={item.toLowerCase()} style={styles.row}>
          <Pressable
            testID={`search-history-item-${item.toLowerCase()}`}
            accessibilityRole="button"
            accessibilityLabel={`Search ${item} again`}
            onPress={() => {
              onSelect(item);
            }}
            style={styles.queryTouch}
          >
            <Text variant="body">{item}</Text>
          </Pressable>
          <Pressable
            testID={`search-history-remove-${item.toLowerCase()}`}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${item} from history`}
            hitSlop={8}
            onPress={() => {
              onRemoveOne(item);
            }}
            style={styles.removeTouch}
          >
            <Text variant="small" color="textSecondary">
              ✕
            </Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontWeight: "700",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  queryTouch: {
    flex: 1,
    paddingVertical: 8,
  },
  removeTouch: {
    padding: 8,
  },
});

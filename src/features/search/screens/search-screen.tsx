/**
 * Search screen (F3).
 *
 * - Local `q` + debounced query; fetch gates on `SEARCH_MIN_LENGTH`.
 * - Short query shows a hint; pending/error map to loading/retry states.
 * - Results reuse canonical `PostCard`/`UserRow` so likes stay in sync.
 */

import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

import { Button, Screen, Text } from "@/shared/ui";

import { logSearchOpen, logSearchQuery } from "../analytics";
import { useDebouncedValue } from "../hooks/use-debounced-value";
import { useSearch } from "../queries/use-search";
import { SEARCH_MIN_LENGTH } from "../schema";
import { SearchBar } from "../components/search-bar";
import { SearchResults } from "../components/search-results";

export function SearchScreen() {
  const [query, setQuery] = useState("");
  const debounced = useDebouncedValue(query, 300);
  const search = useSearch(debounced);

  useEffect(() => {
    logSearchOpen();
  }, []);

  useEffect(() => {
    const normalized = debounced.trim().toLowerCase();
    if (normalized.length >= SEARCH_MIN_LENGTH) logSearchQuery(normalized);
  }, [debounced]);

  const needsMoreChars = debounced.trim().length < SEARCH_MIN_LENGTH;

  return (
    <Screen testID="search-screen">
      <SearchBar
        value={query}
        onChangeText={setQuery}
        onClear={() => {
          setQuery("");
        }}
      />
      {needsMoreChars ? (
        <View style={styles.center}>
          <Text variant="body">Type at least {SEARCH_MIN_LENGTH} characters to search.</Text>
        </View>
      ) : search.isPending ? (
        <View style={styles.center}>
          <Text variant="body" testID="search-loading">
            Searching…
          </Text>
        </View>
      ) : search.isError || !search.data ? (
        <View style={styles.center}>
          <Text variant="title">Search</Text>
          <Text variant="body">Couldn&apos;t run search.</Text>
          <Button
            title="Retry"
            testID="search-retry-button"
            onPress={() => {
              void search.refetch();
            }}
          />
        </View>
      ) : (
        <View style={styles.listFlex}>
          <SearchResults
            userIds={search.userIds}
            postIds={search.postIds}
            isFetchingNextPage={search.isFetchingNextPage}
            isRefetching={search.isRefetching}
            onEndReached={() => {
              if (search.hasNextPage && !search.isFetchingNextPage) void search.fetchNextPage();
            }}
            onRefresh={() => {
              void search.refetch();
            }}
            prefetchPost={search.prefetchPost}
          />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 24,
  },
  listFlex: {
    flex: 1,
  },
});

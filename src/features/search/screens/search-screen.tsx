/**
 * Search screen (F3 results + G2.2 trending/history).
 *
 * - Local `q` + debounced query; fetch gates on `SEARCH_MIN_LENGTH`.
 * - Empty query shows trending (hot tags + suggested users) + local history.
 * - Submit/history-select records the query (per-user kv, deduped, capped).
 * - Results reuse canonical `PostCard`/`UserRow` so likes stay in sync.
 * - Unknown handles/tags fall back to their screens, never a crash.
 */

import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { useMe } from "@/entities/user";
import { Button, Screen, Text } from "@/shared/ui";

import {
  logSearchHistorySelect,
  logSearchOpen,
  logSearchQuery,
  logTrendingOpen,
} from "../analytics";
import { SearchHistoryList } from "../components/search-history-list";
import { TrendingList } from "../components/trending-list";
import { useDebouncedValue } from "../hooks/use-debounced-value";
import { useSearchHistory } from "../hooks/use-search-history";
import { useSearch } from "../queries/use-search";
import { useTrending } from "../queries/use-trending";
import { SEARCH_MIN_LENGTH } from "../schema";
import { SearchBar } from "../components/search-bar";
import { SearchResults } from "../components/search-results";

export function SearchScreen() {
  const [query, setQuery] = useState("");
  const debounced = useDebouncedValue(query, 300);
  const search = useSearch(debounced);
  // Warms `me` so owner menus resolve (fail-closed when unknown).
  const me = useMe();
  const userId = me.data?.id ?? "";
  const history = useSearchHistory(userId);
  const trending = useTrending();

  useEffect(() => {
    logSearchOpen();
  }, []);

  useEffect(() => {
    const normalized = debounced.trim().toLowerCase();
    if (normalized.length >= SEARCH_MIN_LENGTH) logSearchQuery(normalized);
    else if (normalized.length === 0) logTrendingOpen();
  }, [debounced]);

  const submitCurrent = (): void => {
    const normalized = query.trim();
    if (normalized.length >= SEARCH_MIN_LENGTH) history.record(normalized);
  };

  const needsMoreChars = debounced.trim().length < SEARCH_MIN_LENGTH;

  return (
    <Screen testID="search-screen">
      <SearchBar
        value={query}
        onChangeText={setQuery}
        onClear={() => {
          setQuery("");
        }}
        onSubmit={submitCurrent}
      />
      {needsMoreChars ? (
        <ScrollView testID="search-empty-state">
          <SearchHistoryList
            history={history.history}
            onSelect={(item) => {
              logSearchHistorySelect(item);
              setQuery(item);
              history.record(item);
            }}
            onRemoveOne={(item) => {
              history.removeOne(item);
            }}
            onClearAll={() => {
              history.clearAll();
            }}
          />
          <TrendingList
            tags={trending.tags}
            userIds={trending.userIds}
            isPending={trending.isPending}
            isError={trending.isError}
            onRetry={() => {
              void trending.refetch();
            }}
          />
          {history.history.length === 0 &&
          !trending.isPending &&
          !trending.isError &&
          trending.tags.length === 0 &&
          trending.userIds.length === 0 ? (
            <View style={styles.center}>
              <Text variant="body">Type at least {SEARCH_MIN_LENGTH} characters to search.</Text>
            </View>
          ) : null}
        </ScrollView>
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

/**
 * Hashtag screen (G1.5, `/hashtag/[tag]`).
 *
 * G1 scope: a plain header + the matching post list (same canonical
 * `SearchResults` rows as search, so likes/saves stay in sync). Trending,
 * counts, and the pretty header are G2.
 */

import { useLocalSearchParams } from "expo-router";
import { StyleSheet, View } from "react-native";

import { Button, Screen, Text } from "@/shared/ui";

import { SearchResults } from "../components/search-results";
import { useHashtag } from "../queries/use-hashtag";

export function HashtagScreen() {
  const { tag } = useLocalSearchParams<{ tag?: string }>();

  if (!tag || tag.trim().length === 0) {
    return (
      <Screen style={styles.center} testID="hashtag-screen">
        <Text variant="body">Missing hashtag.</Text>
      </Screen>
    );
  }

  return <HashtagBody tag={tag} />;
}

function HashtagBody({ tag }: { tag: string }) {
  const feed = useHashtag(tag);

  if (feed.isPending) {
    return (
      <Screen style={styles.center} testID="hashtag-screen">
        <Text variant="body">Loading #{tag}…</Text>
      </Screen>
    );
  }

  if (feed.isError) {
    return (
      <Screen style={styles.center} testID="hashtag-screen">
        <Text variant="title">#{tag}</Text>
        <Text variant="body">Couldn&apos;t load posts for this tag.</Text>
        <Button
          title="Retry"
          testID="hashtag-retry-button"
          onPress={() => {
            void feed.refetch();
          }}
        />
      </Screen>
    );
  }

  return (
    <Screen testID="hashtag-screen">
      <View style={styles.header}>
        <Text variant="title" testID="hashtag-title">
          #{tag}
        </Text>
      </View>
      <View style={styles.listFlex}>
        <SearchResults
          userIds={[]}
          postIds={feed.postIds}
          isFetchingNextPage={feed.isFetchingNextPage}
          isRefetching={feed.isRefetching}
          onEndReached={() => {
            if (feed.hasNextPage && !feed.isFetchingNextPage) void feed.fetchNextPage();
          }}
          onRefresh={() => {
            void feed.refetch();
          }}
          prefetchPost={feed.prefetchPost}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  listFlex: {
    flex: 1,
  },
});

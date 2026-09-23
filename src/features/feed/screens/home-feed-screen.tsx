import { StyleSheet } from "react-native";

import { Button, Screen, Text } from "@/shared/ui";

import { logFeedRefresh } from "../analytics";
import { FeedList } from "../components/feed-list";
import { FeedSkeleton } from "../components/feed-skeleton";
import { useHomeFeed } from "../queries/use-home-feed";

/**
 * Home feed screen — reads posts with optimistic like through the cache.
 *
 * - First-page pending shows a skeleton; errors show text plus retry.
 * - Likes go through `PostActions` without manual list patching.
 */
export function HomeFeedScreen() {
  const feed = useHomeFeed();

  if (feed.isPending) {
    return (
      <Screen>
        <FeedSkeleton />
      </Screen>
    );
  }

  if (feed.isError) {
    return (
      <Screen style={styles.center}>
        <Text variant="title">Home</Text>
        <Text variant="body">Couldn&apos;t load your feed.</Text>
        <Button
          title="Retry"
          testID="feed-retry-button"
          onPress={() => {
            void feed.refetch();
          }}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <FeedList
        postIds={feed.postIds}
        isFetchingNextPage={feed.isFetchingNextPage}
        isRefetching={feed.isRefetching}
        onEndReached={() => {
          if (feed.hasNextPage && !feed.isFetchingNextPage) void feed.fetchNextPage();
        }}
        onRefresh={() => {
          logFeedRefresh();
          void feed.refetch();
        }}
        prefetchPost={feed.prefetchPost}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
});

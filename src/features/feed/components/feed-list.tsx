/**
 * Feed list — the single `FlashList` that renders the feed.
 *
 * - `data` is a flat `postIds` array read via canonical `PostCard`.
 * - Tapping like also opens detail because nested presses bubble up.
 */

import { Link } from "expo-router";
import { FlashList } from "@shopify/flash-list";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";

import { PostCard } from "@/entities/post";
import { Text, useTheme } from "@/shared/ui";

import { logFeedOpenDetail } from "../analytics";

export type FeedListProps = {
  postIds: string[];
  isFetchingNextPage: boolean;
  isRefetching: boolean;
  onEndReached: () => void;
  onRefresh: () => void;
  prefetchPost: (id: string) => void;
};

function FeedItem({
  postId,
  prefetchPost,
}: {
  postId: string;
  prefetchPost: (id: string) => void;
}) {
  return (
    <Link href={{ pathname: "/post/[id]", params: { id: postId } }} asChild>
      <Pressable
        onPressIn={() => {
          logFeedOpenDetail(postId);
          prefetchPost(postId);
        }}
      >
        <PostCard postId={postId} testID={`post-card-${postId}`} />
      </Pressable>
    </Link>
  );
}

function FeedEmpty() {
  return (
    <View style={styles.empty}>
      <Text variant="body">No posts yet. Pull to refresh.</Text>
    </View>
  );
}

export function FeedList({
  postIds,
  isFetchingNextPage,
  isRefetching,
  onEndReached,
  onRefresh,
  prefetchPost,
}: FeedListProps) {
  const theme = useTheme();

  return (
    <FlashList
      testID="feed-list"
      data={postIds}
      renderItem={({ item }) => <FeedItem postId={item} prefetchPost={prefetchPost} />}
      keyExtractor={(id) => id}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      onRefresh={onRefresh}
      refreshing={isRefetching}
      ListEmptyComponent={<FeedEmpty />}
      ListFooterComponent={
        isFetchingNextPage ? (
          <ActivityIndicator color={theme.color.primary} style={styles.footer} />
        ) : null
      }
      ItemSeparatorComponent={() => <View style={styles.separator} />}
    />
  );
}

const styles = StyleSheet.create({
  empty: {
    alignItems: "center",
    padding: 24,
  },
  footer: {
    padding: 16,
  },
  separator: {
    height: 8,
  },
});

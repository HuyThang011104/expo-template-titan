/**
 * Profile posts list.
 *
 * Own `FlashList` of canonical `postIds` (never another feature's list).
 * Each row links to `/post/[id]` and prefetches the canonical post,
 * mirroring `features/feed/components/feed-list`.
 */

import { Link } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";

import { PostCard } from "@/entities/post";
import { hrefs } from "@/shared/navigation/hrefs";
import { AppList, Text, useTheme } from "@/shared/ui";

import { logProfileOpenDetail } from "../analytics";

export type ProfilePostsListProps = {
  postIds: string[];
  isFetchingNextPage: boolean;
  isRefetching: boolean;
  hasNextPage: boolean;
  onEndReached: () => void;
  onRefresh: () => void;
  prefetchPost: (id: string) => void;
  testID?: string;
};

function ProfilePostItem({
  postId,
  prefetchPost,
}: {
  postId: string;
  prefetchPost: (id: string) => void;
}) {
  return (
    <Link href={hrefs.post(postId)} asChild>
      <Pressable
        onPressIn={() => {
          logProfileOpenDetail(postId);
          prefetchPost(postId);
        }}
      >
        <PostCard postId={postId} testID={`post-card-${postId}`} />
      </Pressable>
    </Link>
  );
}

function ProfilePostsEmpty() {
  return (
    <View style={styles.empty}>
      <Text variant="body">No posts yet.</Text>
    </View>
  );
}

export function ProfilePostsList({
  postIds,
  isFetchingNextPage,
  isRefetching,
  hasNextPage,
  onEndReached,
  onRefresh,
  prefetchPost,
  testID = "profile-list",
}: ProfilePostsListProps) {
  return (
    <AppList
      testID={testID}
      data={postIds}
      renderItem={({ item }) => <ProfilePostItem postId={item} prefetchPost={prefetchPost} />}
      keyExtractor={(id) => id}
      onEndReached={() => {
        if (hasNextPage && !isFetchingNextPage) onEndReached();
      }}
      onRefresh={onRefresh}
      refreshing={isRefetching}
      ListEmptyComponent={<ProfilePostsEmpty />}
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
});

export function ProfilePostsFooter({ visible }: { visible: boolean }) {
  const theme = useTheme();
  if (!visible) return null;
  return <ActivityIndicator color={theme.color.primary} style={styles.footer} />;
}

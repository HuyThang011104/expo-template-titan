/**
 * Search results (F3).
 *
 * - Single `FlashList` of canonical `postIds` (like works cross-cache, no patching here).
 * - Matching users render once as `ListHeaderComponent` via `UserRow`.
 * - Links go through shared `hrefs` so typed routes stay in one place.
 */

import { Link } from "expo-router";
import { FlashList } from "@shopify/flash-list";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";

import { PostCard } from "@/entities/post";
import { UserRow, useUser } from "@/entities/user";
import { hrefs } from "@/shared/navigation/hrefs";
import { Text, useTheme } from "@/shared/ui";

import { logSearchOpen } from "../analytics";

export type SearchResultsProps = {
  userIds: string[];
  postIds: string[];
  isFetchingNextPage: boolean;
  isRefetching: boolean;
  onEndReached: () => void;
  onRefresh: () => void;
  prefetchPost: (id: string) => void;
};

function SearchUserLink({ userId }: { userId: string }) {
  const query = useUser(userId);
  const handle = query.data?.handle;
  if (!handle) {
    return <UserRow userId={userId} testID={`search-user-${userId}`} />;
  }
  return (
    <Link href={hrefs.user(handle)} asChild>
      <Pressable>
        <UserRow userId={userId} testID={`search-user-${userId}`} />
      </Pressable>
    </Link>
  );
}

function SearchPostItem({
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
          logSearchOpen();
          prefetchPost(postId);
        }}
      >
        <PostCard postId={postId} testID={`search-post-card-${postId}`} />
      </Pressable>
    </Link>
  );
}

function SearchHeader({ userIds }: { userIds: string[] }) {
  if (userIds.length === 0) return null;
  return (
    <View style={styles.users}>
      <Text variant="small" style={styles.usersTitle}>
        People
      </Text>
      {userIds.map((id) => (
        <SearchUserLink key={id} userId={id} />
      ))}
      <Text variant="small" style={styles.usersTitle}>
        Posts
      </Text>
    </View>
  );
}

function SearchEmpty() {
  return (
    <View style={styles.empty}>
      <Text variant="body" testID="search-empty">
        No results. Try another keyword.
      </Text>
    </View>
  );
}

export function SearchResults({
  userIds,
  postIds,
  isFetchingNextPage,
  isRefetching,
  onEndReached,
  onRefresh,
  prefetchPost,
}: SearchResultsProps) {
  const theme = useTheme();

  return (
    <FlashList
      testID="search-list"
      data={postIds}
      renderItem={({ item }) => <SearchPostItem postId={item} prefetchPost={prefetchPost} />}
      keyExtractor={(id) => id}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      onRefresh={onRefresh}
      refreshing={isRefetching}
      ListHeaderComponent={<SearchHeader userIds={userIds} />}
      ListEmptyComponent={<SearchEmpty />}
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
  users: {
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  usersTitle: {
    fontWeight: "700",
  },
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

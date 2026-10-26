/**
 * Search results (F3).
 *
 * - Single `FlashList` of canonical `postIds` (like works cross-cache, no patching here).
 * - Matching users render once as `ListHeaderComponent` via `UserRow`.
 * - Links go through shared `hrefs` so typed routes stay in one place.
 */

import { Link, router } from "expo-router";
import { FlashList } from "@shopify/flash-list";
import { Pressable, StyleSheet, View } from "react-native";

import { PostCard } from "@/entities/post";
import { SaveButton } from "@/entities/saved";
import { UserRow, useUser } from "@/entities/user";
import { hrefs } from "@/shared/navigation/hrefs";
import { EmptyState, LoadingState, Text } from "@/shared/ui";

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
        <PostCard
          postId={postId}
          testID={`search-post-card-${postId}`}
          onSafetyPress={() => {
            router.push(hrefs.report("post", postId));
          }}
          onOwnerEditPress={() => {
            router.push(hrefs.editPost(postId));
          }}
          onMentionPress={(handle) => {
            router.push(hrefs.user(handle));
          }}
          onHashtagPress={(tag) => {
            router.push(hrefs.hashtag(tag));
          }}
          saveAffordance={<SaveButton postId={postId} />}
        />
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
    <EmptyState
      icon="search"
      title="No results"
      description="Try another keyword or check the spelling."
      testID="search-empty"
    />
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
          <LoadingState label="Loading more results" style={styles.footer} />
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
  footer: {
    paddingVertical: 16,
  },
  separator: {
    height: 8,
  },
});

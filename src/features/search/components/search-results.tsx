/**
 * Search results (F3).
 *
 * - Segmented `Top | People | Posts`; `Top` mixes the first 3 people with posts.
 * - Single `AppList` of canonical ids (likes work cross-cache, no patching here).
 * - Matching users render via `UserRow`; posts via canonical `PostCard`.
 * - Links go through shared `hrefs` so typed routes stay in one place.
 */

import { Link, router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { PostCard } from "@/entities/post";
import { SaveButton } from "@/entities/saved";
import { UserRow, useUser } from "@/entities/user";
import { hrefs } from "@/shared/navigation/hrefs";
import { AppList, EmptyState, LoadingState, Tabs, useTheme } from "@/shared/ui";

import { logSearchOpen } from "../analytics";

export type SearchResultsProps = {
  userIds: string[];
  postIds: string[];
  isFetchingNextPage: boolean;
  isRefetching: boolean;
  onEndReached: () => void;
  onRefresh: () => void;
  prefetchPost: (id: string) => void;
  /** Hashtag reuses the post list without the user tabs. */
  showTabs?: boolean;
};

type SearchTab = "top" | "people" | "posts";

type SearchRow = { kind: "user"; id: string } | { kind: "post"; id: string };

const TAB_ITEMS = [
  { key: "top", label: "Top", testID: "search-tab-top" },
  { key: "people", label: "People", testID: "search-tab-people" },
  { key: "posts", label: "Posts", testID: "search-tab-posts" },
] as const;

function SearchUserLink({ userId }: { userId: string }) {
  const query = useUser(userId);
  const handle = query.data?.handle;
  if (!handle) {
    return (
      <View style={styles.userRow}>
        <UserRow userId={userId} testID={`search-user-${userId}`} />
      </View>
    );
  }
  return (
    <Link href={hrefs.user(handle)} asChild>
      <Pressable style={styles.userRow}>
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
    <PostCard
      postId={postId}
      testID={`search-post-card-${postId}`}
      onPress={() => {
        router.push(hrefs.post(postId));
      }}
      onPressIn={() => {
        logSearchOpen();
        prefetchPost(postId);
      }}
      onCommentPress={() => {
        router.push(hrefs.post(postId, "comment"));
      }}
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
  showTabs = true,
}: SearchResultsProps) {
  const theme = useTheme();
  const [tab, setTab] = useState<SearchTab>("top");

  const rows: SearchRow[] =
    tab === "people"
      ? userIds.map((id) => ({ kind: "user" as const, id }))
      : tab === "posts"
        ? postIds.map((id) => ({ kind: "post" as const, id }))
        : [
            ...userIds.slice(0, 3).map((id) => ({ kind: "user" as const, id })),
            ...postIds.map((id) => ({ kind: "post" as const, id })),
          ];

  const postsTab = tab !== "people";

  return (
    <View style={styles.root}>
      {showTabs ? (
        <Tabs
          items={TAB_ITEMS}
          value={tab}
          onChange={(key) => {
            setTab(key as SearchTab);
          }}
          variant="segmented"
          accessibilityLabel="Search results"
          testID="search-tabs"
          style={{
            marginHorizontal: theme.space[4],
            marginVertical: theme.space[2],
          }}
        />
      ) : null}
      <AppList
        testID="search-list"
        data={rows}
        renderItem={({ item }) =>
          item.kind === "user" ? (
            <SearchUserLink userId={item.id} />
          ) : (
            <SearchPostItem postId={item.id} prefetchPost={prefetchPost} />
          )
        }
        keyExtractor={(item) => `${item.kind}-${item.id}`}
        onEndReached={postsTab ? onEndReached : undefined}
        onEndReachedThreshold={0.5}
        onRefresh={onRefresh}
        refreshing={isRefetching}
        ListEmptyComponent={<SearchEmpty />}
        ListFooterComponent={
          postsTab && isFetchingNextPage ? (
            <LoadingState label="Loading more results" style={styles.footer} />
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  userRow: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  footer: {
    paddingVertical: 16,
  },
});

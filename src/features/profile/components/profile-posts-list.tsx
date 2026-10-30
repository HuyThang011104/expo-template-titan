/**
 * Profile posts list.
 *
 * Own `FlashList` of canonical `postIds` (never another feature's list).
 * Each row links to `/post/[id]` and prefetches the canonical post,
 * mirroring `features/feed/components/feed-list`.
 */

import type { FlashListRef } from "@shopify/flash-list";
import { router } from "expo-router";
import type { ReactElement, Ref } from "react";
import { StyleSheet, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";

import { PostCard } from "@/entities/post";
import { SaveButton } from "@/entities/saved";
import { hrefs } from "@/shared/navigation/hrefs";
import { AppList, EmptyState, LoadingState } from "@/shared/ui";

import { logProfileOpenDetail } from "../analytics";

export type ProfilePostsListProps = {
  postIds: string[];
  isFetchingNextPage: boolean;
  isRefetching: boolean;
  hasNextPage: boolean;
  onEndReached: () => void;
  onRefresh: () => void;
  prefetchPost: (id: string) => void;
  /** Header block (cover/avatar/identity/action/tabs) inside the same list. */
  header?: ReactElement | null;
  /** Android refresh spinner offset (profile overlay header height). */
  progressViewOffset?: number;
  /** Overrides the default empty state (pending/error/private body). */
  emptyComponent?: ReactElement | null;
  /** Loading footer owned by the page so each pager tab has its own state. */
  footer?: ReactElement | null;
  /** Q7 (PF4.2): one shared-value write per scroll frame. */
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  scrollEventThrottle?: number;
  /** PF4.3: screen-owned handle for tab-switch scroll resets. */
  listRef?: Ref<FlashListRef<string>>;
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
    <PostCard
      postId={postId}
      testID={`post-card-${postId}`}
      disablePressAnimation
      onPress={() => {
        router.push(hrefs.post(postId));
      }}
      onPressIn={() => {
        logProfileOpenDetail(postId);
        prefetchPost(postId);
      }}
      onCommentPress={() => {
        router.push(hrefs.post(postId, "comment"));
      }}
      onMediaPress={(index) => {
        router.push(hrefs.mediaViewer(postId, index));
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

function ProfilePostsEmpty() {
  return (
    <EmptyState
      icon="image"
      title="No posts yet"
      description="Posts you share will appear here."
      testID="profile-empty"
    />
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
  header,
  progressViewOffset,
  emptyComponent,
  footer,
  onScroll,
  scrollEventThrottle,
  listRef,
  testID = "profile-list",
}: ProfilePostsListProps) {
  return (
    <AppList
      ref={listRef}
      testID={testID}
      data={postIds}
      renderItem={({ item }) => <ProfilePostItem postId={item} prefetchPost={prefetchPost} />}
      keyExtractor={(id) => id}
      onEndReached={() => {
        if (hasNextPage && !isFetchingNextPage) onEndReached();
      }}
      onRefresh={onRefresh}
      refreshing={isRefetching}
      progressViewOffset={progressViewOffset}
      onScroll={onScroll}
      scrollEventThrottle={scrollEventThrottle}
      ListHeaderComponent={header ?? null}
      ListEmptyComponent={emptyComponent ?? <ProfilePostsEmpty />}
      ListFooterComponent={footer ?? null}
    />
  );
}

const styles = StyleSheet.create({
  footer: {
    paddingVertical: 16,
  },
});

export function ProfilePostsFooter({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return <LoadingState label="Loading more posts" style={styles.footer} />;
}

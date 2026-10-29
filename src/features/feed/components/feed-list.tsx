/**
 * Feed list — the single `FlashList` that renders the feed.
 *
 * - `data` is a flat `postIds` array read via canonical `PostCard`.
 * - F7a: viewability drives a single `activeVideoId` (never autoplay many).
 *   Blur/background clears it so video pauses off-screen.
 * - F5: cards are flat rows with a hairline divider (`PostCard` draws it),
 *   so the list owns no separator. Navigation is a `PostCard` callback
 *   (no `Link` press wrapper), which keeps the press geometry on the card.
 */

import { router, useFocusEffect } from "expo-router";
import { FlashList } from "@shopify/flash-list";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { AppState, StyleSheet } from "react-native";

import { PostCard, getPostData } from "@/entities/post";
import { SaveButton } from "@/entities/saved";
import { hrefs } from "@/shared/navigation/hrefs";
import { EmptyState, LoadingState } from "@/shared/ui";

import { logFeedOpenDetail } from "../analytics";
import { pickActiveVideoId, type FeedMediaKind } from "../hooks/use-active-video-id";

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
  isVideoActive,
}: {
  postId: string;
  prefetchPost: (id: string) => void;
  isVideoActive: boolean;
}) {
  return (
    <PostCard
      postId={postId}
      testID={`post-card-${postId}`}
      isVideoActive={isVideoActive}
      onPress={() => {
        router.push(hrefs.post(postId));
      }}
      onPressIn={() => {
        logFeedOpenDetail(postId);
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

function FeedEmpty() {
  return (
    <EmptyState
      icon="inbox"
      title="No posts yet"
      description="Pull to refresh to check for new posts."
      testID="feed-empty"
    />
  );
}

const VIEWABILITY_CONFIG = {
  itemVisiblePercentThreshold: 65,
  minimumViewTime: 400,
};

export function FeedList({
  postIds,
  isFetchingNextPage,
  isRefetching,
  onEndReached,
  onRefresh,
  prefetchPost,
}: FeedListProps) {
  const queryClient = useQueryClient();
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);

  // Leaving the tab (e.g. opening detail) pauses the active video.
  useFocusEffect(
    useCallback(() => {
      return () => {
        setActiveVideoId(null);
      };
    }, []),
  );

  // Backgrounding the app pauses the active video.
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") {
        setActiveVideoId(null);
      }
    });
    return () => {
      subscription.remove();
    };
  }, []);

  const handleViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: { item: string }[] }) => {
      const kindById = new Map<string, FeedMediaKind>();
      const viewableIds: string[] = [];
      for (const entry of viewableItems) {
        const id = entry.item;
        viewableIds.push(id);
        const mediaKind = getPostData(queryClient, id)?.media[0]?.kind;
        kindById.set(id, mediaKind === "video" ? "video" : mediaKind === "image" ? "image" : "none");
      }
      setActiveVideoId(pickActiveVideoId(viewableIds, kindById));
    },
    [queryClient],
  );

  return (
    <FlashList
      testID="feed-list"
      data={postIds}
      renderItem={({ item }) => (
        <FeedItem postId={item} prefetchPost={prefetchPost} isVideoActive={item === activeVideoId} />
      )}
      keyExtractor={(id) => id}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      onRefresh={onRefresh}
      refreshing={isRefetching}
      viewabilityConfig={VIEWABILITY_CONFIG}
      onViewableItemsChanged={handleViewableItemsChanged}
      ListEmptyComponent={<FeedEmpty />}
      ListFooterComponent={
        isFetchingNextPage ? (
          <LoadingState label="Loading more posts" style={styles.footer} />
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  footer: {
    paddingVertical: 16,
  },
});

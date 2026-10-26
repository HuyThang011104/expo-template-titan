/**
 * Hashtag screen (G1.5 posts + G2.2 header count).
 *
 * Header shows `#tag` + đếm bài (server total, loaded-ids fallback).
 * Posts reuse the canonical `SearchResults` rows so likes/saves stay in
 * sync and taps open the right post. Unknown/empty tags show an empty
 * page with 0 count, never a crash.
 */

import { useLocalSearchParams } from "expo-router";
import { StyleSheet, View } from "react-native";

import { EmptyState, ErrorState, LoadingState, Screen } from "@/shared/ui";

import { HashtagHeader } from "../components/hashtag-header";
import { SearchResults } from "../components/search-results";
import { useHashtag } from "../queries/use-hashtag";
import { normalizeHashtag } from "../schema";

export function HashtagScreen() {
  const { tag } = useLocalSearchParams<{ tag?: string }>();
  const normalized = normalizeHashtag(typeof tag === "string" ? tag : "");

  if (!tag || normalized.length === 0) {
    return (
      <Screen testID="hashtag-screen">
        <EmptyState
          icon="search"
          title="Missing hashtag"
          description="Open a tag from a post or search."
          testID="hashtag-missing"
        />
      </Screen>
    );
  }

  return <HashtagBody tag={tag} />;
}

function HashtagBody({ tag }: { tag: string }) {
  const feed = useHashtag(tag);
  const normalized = feed.normalizedTag || normalizeHashtag(tag);

  if (feed.isPending) {
    return (
      <Screen testID="hashtag-screen">
        <LoadingState label={`Loading #${normalized}`} testID="hashtag-loading" />
      </Screen>
    );
  }

  if (feed.isError) {
    return (
      <Screen testID="hashtag-screen">
        <ErrorState
          title={`#${normalized}`}
          message="Couldn't load posts for this tag."
          testID="hashtag-error"
          retryTestID="hashtag-retry-button"
          onRetry={() => {
            void feed.refetch();
          }}
        />
      </Screen>
    );
  }

  return (
    <Screen testID="hashtag-screen">
      <HashtagHeader tag={normalized} postCount={feed.postCount} />
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
  listFlex: {
    flex: 1,
  },
});

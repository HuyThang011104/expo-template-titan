import { useMe } from "@/entities/user";
import { ErrorState, Screen } from "@/shared/ui";

import { logFeedRefresh } from "../analytics";
import { FeedList } from "../components/feed-list";
import { FeedSkeleton } from "../components/feed-skeleton";
import { useHomeFeed } from "../queries/use-home-feed";

/**
 * Home feed screen — reads posts with optimistic like through the cache.
 *
 * - First-page pending shows a skeleton; errors use the shared error state.
 * - Likes go through `PostActions` without manual list patching.
 * - `useMe` warms the `me` entry so owner menus (`PostOwnerMenu`) can
 *   resolve without fetching (fail-closed when unknown).
 */
export function HomeFeedScreen() {
  const feed = useHomeFeed();
  useMe();

  if (feed.isPending) {
    return (
      <Screen>
        <FeedSkeleton />
      </Screen>
    );
  }

  if (feed.isError) {
    return (
      <Screen>
        <ErrorState
          title="Couldn't load your feed"
          message="Check your connection and try again."
          testID="feed-error"
          retryTestID="feed-retry-button"
          onRetry={() => {
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

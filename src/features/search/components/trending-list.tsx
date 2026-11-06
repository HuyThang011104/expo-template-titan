/**
 * Trending list (G2.2).
 *
 * Shown when the search box is empty: hot tags + suggested users.
 * Taps go through shared `hrefs` so user/post/tag navigation stays in one
 * place; unknown handles/tags fall back to their screens (never a crash).
 */

import { Link, router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { UserRow, useUser } from "@/entities/user";
import { hrefs } from "@/shared/navigation/hrefs";
import { ErrorState, ListItem, LoadingState, Text } from "@/shared/ui";

import type { HashtagInfo } from "../schema";

export type TrendingListProps = {
  tags: HashtagInfo[];
  userIds: string[];
  isPending: boolean;
  isError: boolean;
  onRetry: () => void;
  onTagPress?: (tag: string) => void;
};

function TrendingTagRow({
  info,
  rank,
  onPress,
}: {
  info: HashtagInfo;
  rank: number;
  onPress?: (tag: string) => void;
}) {
  return (
    <ListItem
      testID={`trending-tag-${info.tag}`}
      accessibilityLabel={`Hashtag ${info.tag}, ${info.postCount} posts`}
      leading={
        <Text variant="h3" color="textTertiary">
          {rank}
        </Text>
      }
      title={`#${info.tag}`}
      titleVariant="labelStrong"
      subtitle={info.postCount === 1 ? "1 post" : `${info.postCount} posts`}
      onPress={() => {
        onPress?.(info.tag);
        router.push(hrefs.hashtag(info.tag));
      }}
      style={styles.tagItem}
    />
  );
}

function SuggestedUserRow({ userId }: { userId: string }) {
  const query = useUser(userId);
  const handle = query.data?.handle;
  if (!handle) {
    return <UserRow userId={userId} testID={`trending-user-${userId}`} />;
  }
  return (
    <Link href={hrefs.user(handle)} asChild>
      <Pressable>
        <UserRow userId={userId} testID={`trending-user-${userId}`} />
      </Pressable>
    </Link>
  );
}

export function TrendingList({ tags, userIds, isPending, isError, onRetry, onTagPress }: TrendingListProps) {
  if (isPending) {
    return (
      <LoadingState
        variant="skeleton"
        rows={2}
        label="Loading trending"
        testID="trending-loading"
        style={styles.section}
      />
    );
  }
  if (isError) {
    return (
      <ErrorState
        title="Couldn't load trending"
        message="Pull to refresh or try again."
        testID="trending-error"
        retryTestID="trending-retry-button"
        onRetry={onRetry}
        style={styles.section}
      />
    );
  }
  if (tags.length === 0 && userIds.length === 0) return null;
  return (
    <View testID="trending-list">
      {tags.length > 0 ? (
        <View style={styles.section}>
          <Text variant="labelStrong" color="textSecondary">
            Trending
          </Text>
          {tags.map((info, index) => (
            <TrendingTagRow key={info.tag} info={info} rank={index + 1} onPress={onTagPress} />
          ))}
        </View>
      ) : null}
      {userIds.length > 0 ? (
        <View style={styles.section}>
          <Text variant="labelStrong" color="textSecondary">
            Suggested
          </Text>
          {userIds.map((id) => (
            <SuggestedUserRow key={id} userId={id} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  tagItem: {
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
});

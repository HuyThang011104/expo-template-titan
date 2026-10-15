/**
 * Trending list (G2.2).
 *
 * Shown when the search box is empty: hot tags + suggested users.
 * Taps go through shared `hrefs` so user/post/tag navigation stays in one
 * place; unknown handles/tags fall back to their screens (never a crash).
 */

import { Link } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { UserRow, useUser } from "@/entities/user";
import { hrefs } from "@/shared/navigation/hrefs";
import { Button, Text } from "@/shared/ui";

import type { HashtagInfo } from "../schema";

export type TrendingListProps = {
  tags: HashtagInfo[];
  userIds: string[];
  isPending: boolean;
  isError: boolean;
  onRetry: () => void;
  onTagPress?: (tag: string) => void;
};

function TrendingTagRow({ info, onPress }: { info: HashtagInfo; onPress?: (tag: string) => void }) {
  const content = (
    <Pressable
      testID={`trending-tag-${info.tag}`}
      accessibilityRole="button"
      accessibilityLabel={`Hashtag ${info.tag}, ${info.postCount} posts`}
      onPress={() => {
        onPress?.(info.tag);
      }}
      style={styles.tagRow}
    >
      <Text variant="small" style={styles.tagName}>
        #{info.tag}
      </Text>
      <Text variant="caption" color="textSecondary">
        {info.postCount} bài viết
      </Text>
    </Pressable>
  );
  // Navigation stays declarative; the optional callback fills the search box.
  return (
    <Link href={hrefs.hashtag(info.tag)} asChild>
      {content}
    </Link>
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
      <View style={styles.section} testID="trending-list">
        <Text variant="body" testID="trending-loading">
          Đang tải trending…
        </Text>
      </View>
    );
  }
  if (isError) {
    return (
      <View style={styles.section} testID="trending-list">
        <Text variant="small">Couldn&apos;t load trending.</Text>
        <Button title="Retry" size="sm" variant="secondary" testID="trending-retry-button" onPress={onRetry} />
      </View>
    );
  }
  if (tags.length === 0 && userIds.length === 0) return null;
  return (
    <View testID="trending-list">
      {tags.length > 0 ? (
        <View style={styles.section}>
          <Text variant="small" style={styles.title}>
            Trending
          </Text>
          {tags.map((info) => (
            <TrendingTagRow key={info.tag} info={info} onPress={onTagPress} />
          ))}
        </View>
      ) : null}
      {userIds.length > 0 ? (
        <View style={styles.section}>
          <Text variant="small" style={styles.title}>
            Gợi ý
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
  title: {
    fontWeight: "700",
  },
  tagRow: {
    gap: 2,
    paddingVertical: 4,
  },
  tagName: {
    fontWeight: "700",
  },
});

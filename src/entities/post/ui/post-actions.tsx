/**
 * Like button.
 *
 * Reads `usePost` + `useLikePost`; disabled while pending
 * to reduce double-taps.
 */

import { Pressable, StyleSheet, View } from "react-native";

import { formatCompact } from "@/shared/lib/number";
import { Icon, Text } from "@/shared/ui";

import { useLikePost, usePost } from "../queries";

export type PostActionsProps = {
  postId: string;
  testID?: string;
};

export function PostActions({ postId, testID }: PostActionsProps) {
  const postQuery = usePost(postId);
  const likeMutation = useLikePost(postId);
  const post = postQuery.data;

  // Null when used standalone without a cached post; never crashes.
  if (!post) return null;

  const liked = post.likedByMe;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={liked ? "Unlike" : "Like"}
      accessibilityState={{ selected: liked, busy: likeMutation.isPending }}
      disabled={likeMutation.isPending}
      hitSlop={8}
      onPress={() => likeMutation.mutate()}
      style={styles.touch}
    >
      <View style={styles.row}>
        <Icon
          name={liked ? "heartFill" : "heart"}
          size="md"
          color={liked ? "danger" : "textSecondary"}
        />
        <Text
          variant="label"
          color={liked ? "danger" : "textSecondary"}
          style={styles.count}
        >
          {formatCompact(post.likeCount)}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  touch: {
    alignSelf: "flex-start",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  count: {
    fontVariant: ["tabular-nums"],
  },
});

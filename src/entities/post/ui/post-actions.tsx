/**
 * Like button.
 *
 * Reads `usePost` + `useLikePost`; disabled while pending
 * to reduce double-taps.
 */

import { Pressable, StyleSheet } from "react-native";

import { formatCompact } from "@/shared/lib/number";
import { Text } from "@/shared/ui/text";

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
      <Text variant="small" color={liked ? "primary" : "textSecondary"} style={styles.label}>
        ♥ {formatCompact(post.likeCount)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  touch: {
    alignSelf: "flex-start",
  },
  label: {
    fontWeight: "700",
  },
});

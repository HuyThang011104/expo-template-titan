/**
 * Post action row — the single row under every card.
 *
 * Spec: docs/feel-spec.md §4.1 (F14). `comment` is icon-only (the feature
 * opens detail with `focus=comment`), `like` shows the count only when > 0,
 * then a spacer pushes `share`/`save` to the right. Like fills + haptic +
 * spring pop on like only (F3, F10 — reduce motion drops the spring).
 */

import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { hapticLight } from "@/shared/lib/haptics";
import { formatCompact } from "@/shared/lib/number";
import { Icon, PressableScale, Text, useTheme } from "@/shared/ui";

import { useLikePost, usePost } from "../queries";
import { PostShareButton } from "./post-share-button";

export type PostActionsProps = {
  postId: string;
  testID?: string;
  onCommentPress?: () => void;
  /** Cross-entity by design: the feature injects `<SaveButton postId />`. */
  saveAffordance?: ReactNode;
};

export function PostActions({
  postId,
  testID,
  onCommentPress,
  saveAffordance,
}: PostActionsProps) {
  const likeTestID = testID ?? `like-button-${postId}`;
  const theme = useTheme();
  const postQuery = usePost(postId);
  const likeMutation = useLikePost(postId);
  const reduceMotion = useReducedMotion();
  const pop = useSharedValue(1);

  const popStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pop.value }],
  }));

  // Null when used standalone without a cached post; never crashes.
  const post = postQuery.data;
  if (!post) return null;

  const liked = post.likedByMe;

  function handleLike(): void {
    if (!liked) {
      hapticLight();
      if (!reduceMotion) {
        pop.set(
          withSequence(
            withTiming(1.3, { duration: 120 }),
            withSpring(1, { damping: 12, stiffness: 220, mass: 0.6 }),
          ),
        );
      }
    }
    likeMutation.mutate();
  }

  return (
    <View style={styles.row}>
      <View style={[styles.group, { gap: theme.space[2] }]}>
        {onCommentPress ? (
          <Pressable
            testID={`comment-button-${postId}`}
            accessibilityRole="button"
            accessibilityLabel="Comment"
            hitSlop={theme.space[1]}
            onPress={onCommentPress}
            style={styles.touch}
          >
            <Icon name="comment" size="md" color="textSecondary" decorative />
          </Pressable>
        ) : null}

        <PressableScale
          testID={likeTestID}
          accessibilityRole="button"
          accessibilityLabel={liked ? "Unlike" : "Like"}
          accessibilityState={{ selected: liked, busy: likeMutation.isPending }}
          disabled={likeMutation.isPending}
          hitSlop={theme.space[1]}
          onPress={handleLike}
          style={styles.touch}
        >
          <View style={styles.likeRow}>
            <Animated.View style={popStyle}>
              <Icon
                name={liked ? "heartFill" : "heart"}
                size="md"
                color={liked ? "danger" : "textSecondary"}
                decorative
              />
            </Animated.View>
            {post.likeCount > 0 ? (
              <Text
                variant="label"
                color={liked ? "danger" : "textSecondary"}
                style={styles.count}
              >
                {formatCompact(post.likeCount)}
              </Text>
            ) : null}
          </View>
        </PressableScale>
      </View>

      <View style={styles.spacer} />

      <View style={[styles.group, { gap: theme.space[2] }]}>
        <PostShareButton postId={postId} />
        {saveAffordance}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  group: {
    flexDirection: "row",
    alignItems: "center",
  },
  spacer: {
    flex: 1,
  },
  touch: {
    minHeight: 44,
    minWidth: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  likeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  count: {
    fontVariant: ["tabular-nums"],
  },
});

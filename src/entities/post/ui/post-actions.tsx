/**
 * Post action row — the single row under every card.
 *
 * Spec: docs/feel-spec.md §4.1 (F14). Four equal icon actions: Like,
 * Comment, Repost, Share. Like shows its count only when > 0; Save lives in
 * the three-dot options sheet. Like fills + haptic + spring pop (F3, F10 —
 * reduce motion drops the spring). Repost is a feature-owned callback until
 * the server endpoint lands.
 */

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
  /** Feature-owned until the repost endpoint exists. */
  onRepostPress?: () => void;
};

type PlainActionProps = {
  icon: "comment" | "repost";
  testID: string;
  accessibilityLabel: string;
  onPress?: () => void;
};

function PlainAction({ icon, testID, accessibilityLabel, onPress }: PlainActionProps) {
  const theme = useTheme();

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={theme.space[1]}
      onPress={onPress}
      style={styles.action}
    >
      <Icon name={icon} size="md" color="textSecondary" decorative />
    </Pressable>
  );
}

export function PostActions({ postId, testID, onCommentPress, onRepostPress }: PostActionsProps) {
  const likeTestID = testID ?? `like-button-${postId}`;
  const theme = useTheme();
  const postQuery = usePost(postId);
  const likeMutation = useLikePost(postId);
  const reduceMotion = useReducedMotion();
  const pop = useSharedValue(1);

  const popStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pop.value }],
  }));

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
    <View style={[styles.row, { borderTopColor: theme.color.border }]}>
      <PressableScale
        testID={likeTestID}
        accessibilityRole="button"
        accessibilityLabel={liked ? "Unlike" : "Like"}
        accessibilityState={{ selected: liked, busy: likeMutation.isPending }}
        disabled={likeMutation.isPending}
        hitSlop={theme.space[1]}
        onPress={handleLike}
        style={styles.action}
      >
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
            numberOfLines={1}
            style={styles.count}
          >
            {formatCompact(post.likeCount)}
          </Text>
        ) : null}
      </PressableScale>

      {onCommentPress ? (
        <PlainAction
          icon="comment"
          testID={`comment-button-${postId}`}
          accessibilityLabel="Comment"
          onPress={onCommentPress}
        />
      ) : null}

      <PlainAction
        icon="repost"
        testID={`repost-button-${postId}`}
        accessibilityLabel="Repost"
        onPress={onRepostPress}
      />

      <PostShareButton postId={postId} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 4,
  },
  action: {
    flex: 1,
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 2,
  },
  count: {
    fontVariant: ["tabular-nums"],
  },
});

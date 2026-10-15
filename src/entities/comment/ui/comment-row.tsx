/**
 * Dumb comment row (G1.2).
 *
 * Takes `commentId` and reads the canonical `useComment`. The author preview
 * comes from the canonical user entry written by `hydrateCommentItem`,
 * using a local structural type — never an `entities/user` import.
 * Reply navigation is injected via `onReplyPress` (feature-owned).
 */

import { Pressable, StyleSheet, View } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { formatRelative } from "@/shared/lib/date";
import { queryKeys } from "@/shared/query";
import { Text } from "@/shared/ui/text";
import { useTheme } from "@/shared/ui/theme/use-theme";

import { useComment, useLikeComment } from "../queries";

export type CommentRowProps = {
  commentId: string;
  /** 0 top-level, 1 reply (indented). */
  depth?: 0 | 1;
  onReplyPress?: (comment: { id: string; handle: string }) => void;
  testID?: string;
};

type AuthorPreview = {
  handle?: unknown;
  displayName?: unknown;
};

function useCommentAuthorSnapshot(authorId: string): { displayName: string; handle: string } {
  const qc = useQueryClient();
  // Reactive read of the canonical user entry (G2.1): subscribes to
  // `queryKeys.user(authorId)` so profile edits propagate to comments.
  // Local structural type — never an `entities/user` import.
  const authorQuery = useQuery({
    queryKey: queryKeys.user(authorId),
    queryFn: async (): Promise<AuthorPreview> => {
      const cached = qc.getQueryData<AuthorPreview>(queryKeys.user(authorId));
      if (cached) return cached;
      throw new Error(`Unknown user ${authorId}`);
    },
    staleTime: 30_000,
    retry: false,
    enabled: authorId.length > 0,
  });
  const data = authorQuery.data;
  const displayName =
    typeof data?.displayName === "string" && data.displayName.length > 0
      ? data.displayName
      : "Unknown user";
  const handle =
    typeof data?.handle === "string" && data.handle.length > 0 ? data.handle : "unknown";
  return { displayName, handle };
}

export function CommentRow({ commentId, depth = 0, onReplyPress, testID }: CommentRowProps) {
  const theme = useTheme();
  const query = useComment(commentId);
  const like = useLikeComment(commentId);
  const snapshot = useCommentAuthorSnapshot(query.data?.authorId ?? "");

  if (query.isPending) {
    return (
      <View style={[styles.row, depth === 1 && styles.reply]} testID={testID}>
        <View
          style={[
            styles.skeleton,
            { backgroundColor: theme.color.backgroundElement, borderRadius: theme.radius.sm },
          ]}
        />
      </View>
    );
  }

  if (query.isError || !query.data) {
    return (
      <Text variant="small" color="textSecondary" testID={testID}>
        Comment unavailable
      </Text>
    );
  }

  const comment = query.data;
  return (
    <View style={[styles.row, depth === 1 && styles.reply]} testID={testID ?? `comment-row-${commentId}`}>
      <View style={styles.body}>
        <Text variant="small" style={styles.author}>
          {snapshot.displayName}{" "}
          <Text variant="caption" color="textSecondary">
            @{snapshot.handle} · {formatRelative(comment.createdAt)}
          </Text>
        </Text>
        <Text variant="body">{comment.body}</Text>
        <View style={styles.actions}>
          <Pressable
            testID={`comment-like-${commentId}`}
            accessibilityRole="button"
            accessibilityLabel={comment.likedByMe ? "Unlike comment" : "Like comment"}
            hitSlop={8}
            disabled={like.isPending}
            onPress={() => {
              like.mutate();
            }}
            style={styles.actionTouch}
          >
            <Text
              variant="small"
              style={{ color: comment.likedByMe ? theme.color.primary : theme.color.textSecondary }}
            >
              ♥ {comment.likeCount}
            </Text>
          </Pressable>
          {onReplyPress ? (
            <Pressable
              testID={`comment-reply-${commentId}`}
              accessibilityRole="button"
              accessibilityLabel="Reply to comment"
              hitSlop={8}
              onPress={() => {
                onReplyPress({ id: comment.id, handle: snapshot.handle });
              }}
              style={styles.actionTouch}
            >
              <Text variant="small" color="textSecondary">
                Reply
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  reply: {
    paddingLeft: 40,
  },
  body: {
    gap: 4,
  },
  author: {
    fontWeight: "700",
  },
  actions: {
    flexDirection: "row",
    gap: 16,
    marginTop: 2,
  },
  actionTouch: {
    paddingVertical: 4,
  },
  skeleton: {
    width: 160,
    height: 14,
  },
});

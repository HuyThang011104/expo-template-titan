/**
 * Dumb comment row (G1.2, PF3.1).
 *
 * Takes `commentId` and reads the canonical `useComment`. The author preview
 * comes from the canonical user entry written by `hydrateCommentItem`,
 * using a local structural type — never an `entities/user` import.
 * Reply navigation is injected via `onReplyPress` (feature-owned).
 *
 * Spec: docs/feel-spec.md §4.3. Anatomy is `Avatar 32` leading + a column
 * (name/handle/time, body, small like + Reply actions); replies indent one
 * level by `32 + 8`.
 */

import { Pressable, StyleSheet, View } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { formatRelative } from "@/shared/lib/date";
import { queryKeys } from "@/shared/query";
import { Avatar, Icon, Skeleton, Text } from "@/shared/ui";

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
  avatarUrl?: unknown;
};

type AuthorSnapshot = {
  displayName: string;
  handle: string;
  avatarUrl: string | null;
};

function useCommentAuthorSnapshot(authorId: string): AuthorSnapshot {
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
  const avatarUrl = typeof data?.avatarUrl === "string" ? data.avatarUrl : null;
  return { displayName, handle, avatarUrl };
}

export function CommentRow({ commentId, depth = 0, onReplyPress, testID }: CommentRowProps) {
  const query = useComment(commentId);
  const like = useLikeComment(commentId);
  const snapshot = useCommentAuthorSnapshot(query.data?.authorId ?? "");

  if (query.isPending) {
    return (
      <View
        testID={testID}
        style={[styles.row, depth === 1 && styles.replyIndent]}
        accessible
        accessibilityLabel="Loading comment"
      >
        <Skeleton width={32} height={32} radius="full" />
        <View style={styles.body}>
          <Skeleton width={140} height={12} />
          <Skeleton height={14} width="80%" />
        </View>
      </View>
    );
  }

  if (query.isError || !query.data) {
    return (
      <Text variant="label" color="textSecondary" testID={testID}>
        Comment unavailable
      </Text>
    );
  }

  const comment = query.data;
  return (
    <View
      style={[styles.row, depth === 1 && styles.replyIndent]}
      testID={testID ?? `comment-row-${commentId}`}
    >
      <Avatar
        displayName={snapshot.displayName}
        avatarUrl={snapshot.avatarUrl}
        size={32}
      />
      <View style={styles.body}>
        <Text variant="labelStrong" numberOfLines={1}>
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
            accessibilityState={{ selected: comment.likedByMe, busy: like.isPending }}
            hitSlop={8}
            disabled={like.isPending}
            onPress={() => {
              like.mutate();
            }}
            style={styles.actionTouch}
          >
            <View style={styles.actionRow}>
              <Icon
                name={comment.likedByMe ? "heartFill" : "heart"}
                size="sm"
                color={comment.likedByMe ? "danger" : "textSecondary"}
                decorative
              />
              <Text
                variant="label"
                color={comment.likedByMe ? "danger" : "textSecondary"}
                style={styles.count}
              >
                {comment.likeCount}
              </Text>
            </View>
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
              <Text variant="label" color="textSecondary">
                Reply
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const REPLY_INDENT = 32 + 8;

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  replyIndent: {
    paddingLeft: REPLY_INDENT,
  },
  body: {
    flex: 1,
    gap: 4,
  },
  actions: {
    flexDirection: "row",
    gap: 16,
    marginTop: 2,
  },
  actionTouch: {
    paddingVertical: 4,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  count: {
    fontVariant: ["tabular-nums"],
  },
});

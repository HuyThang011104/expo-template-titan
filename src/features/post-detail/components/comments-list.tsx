/**
 * Post comments list (G1.2).
 *
 * Infinite id-list over the canonical comment cache (same discipline as
 * `ProfilePostsList`): pages hold ids, rows read `useComment`. Display
 * order comes from `buildCommentThread` — top-level newest-first (new
 * comments prepend head), replies oldest-first indented one level.
 */

import { useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import {
  buildCommentThread,
  CommentRow,
  getCommentData,
  usePostComments,
} from "@/entities/comment";
import { AppList, Button, Text, useTheme } from "@/shared/ui";

import type { ReplyTarget } from "./comment-composer";

export type CommentsListProps = {
  postId: string;
  header: ReactNode;
  onReplyPress: (target: ReplyTarget) => void;
  fetchImpl?: typeof fetch;
};

export function CommentsList({ postId, header, onReplyPress, fetchImpl }: CommentsListProps) {
  const theme = useTheme();
  const qc = useQueryClient();
  const comments = usePostComments(postId, { fetchImpl });

  if (comments.isPending) {
    return (
      <View style={styles.flex}>
        {header}
        <View style={styles.center}>
          <Text variant="body">Loading comments…</Text>
        </View>
      </View>
    );
  }

  if (comments.isError) {
    return (
      <View style={styles.flex}>
        {header}
        <View style={styles.center}>
          <Text variant="body">Couldn&apos;t load comments.</Text>
          <Button
            title="Retry"
            testID="comments-retry-button"
            onPress={() => {
              void comments.refetch();
            }}
          />
        </View>
      </View>
    );
  }

  const rows = buildCommentThread(
    comments.commentIds
      .map((id) => getCommentData(qc, id))
      .filter((comment) => comment !== undefined),
  );
  const totalHint = comments.hasNextPage ? "+" : "";

  return (
    <View style={styles.flex}>
      <AppList
        testID="comments-list"
        data={rows}
        renderItem={({ item }) => (
          <CommentRow commentId={item.comment.id} depth={item.depth} onReplyPress={onReplyPress} />
        )}
        keyExtractor={(item) => item.comment.id}
        ListHeaderComponent={
          <View>
            {header}
            <Text variant="small" color="textSecondary" style={styles.count}>
              Comments ({comments.commentIds.length}
              {totalHint})
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.center}>
            <Text variant="body">Be the first to comment.</Text>
          </View>
        }
        ListFooterComponent={
          comments.isFetchingNextPage ? (
            <ActivityIndicator color={theme.color.primary} style={styles.footer} />
          ) : null
        }
        onEndReached={() => {
          if (comments.hasNextPage && !comments.isFetchingNextPage) void comments.fetchNextPage();
        }}
        onRefresh={() => {
          void comments.refetch();
        }}
        refreshing={comments.isRefetching}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 24,
  },
  count: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  footer: {
    padding: 16,
  },
});

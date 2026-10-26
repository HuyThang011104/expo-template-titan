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
import { StyleSheet, View } from "react-native";

import {
  buildCommentThread,
  CommentRow,
  getCommentData,
  usePostComments,
} from "@/entities/comment";
import {
  AppList,
  EmptyState,
  ErrorState,
  LoadingState,
  Text,
} from "@/shared/ui";

import type { ReplyTarget } from "./comment-composer";

export type CommentsListProps = {
  postId: string;
  header: ReactNode;
  onReplyPress: (target: ReplyTarget) => void;
  fetchImpl?: typeof fetch;
};

export function CommentsList({ postId, header, onReplyPress, fetchImpl }: CommentsListProps) {
  const qc = useQueryClient();
  const comments = usePostComments(postId, { fetchImpl });

  if (comments.isPending) {
    return (
      <View style={styles.flex}>
        {header}
        <LoadingState label="Loading comments" testID="comments-loading" />
      </View>
    );
  }

  if (comments.isError) {
    return (
      <View style={styles.flex}>
        {header}
        <ErrorState
          title="Couldn't load comments"
          message="Check your connection and try again."
          testID="comments-error"
          retryTestID="comments-retry-button"
          onRetry={() => {
            void comments.refetch();
          }}
        />
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
          <EmptyState
            icon="comment"
            title="Be the first to comment"
            description="Replies appear here."
            testID="comments-empty"
          />
        }
        ListFooterComponent={
          comments.isFetchingNextPage ? (
            <LoadingState label="Loading more comments" style={styles.footer} />
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
  count: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  footer: {
    paddingVertical: 16,
  },
});

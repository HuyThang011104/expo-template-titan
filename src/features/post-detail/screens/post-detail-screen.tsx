import { router, useLocalSearchParams } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { PostCard, usePost } from "@/entities/post";
import { SaveButton } from "@/entities/saved";
import { getViewBlockReason, useMe, useRelationship } from "@/entities/user";
import { hrefs } from "@/shared/navigation/hrefs";
import { EmptyState, ErrorState, LoadingState, Screen } from "@/shared/ui";

import { CommentComposer, type ReplyTarget } from "../components/comment-composer";
import { CommentsList } from "../components/comments-list";

/**
 * Post detail screen (`/post/[id]`) — renders `PostCard(postId)` from the canonical cache.
 * Unknown ids show a fallback, never a crash. Posts by private/blocked
 * authors are gated behind the relationship (G1.1 fail-closed).
 */
export function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();

  if (!id) {
    return (
      <Screen>
        <EmptyState
          icon="alert"
          title="Missing post id"
          description="Open a post from the feed to view it here."
          testID="post-missing-id"
        />
      </Screen>
    );
  }

  return <PostDetailBody postId={id} />;
}

function PostDetailBody({ postId }: { postId: string }) {
  const qc = useQueryClient();
  const post = usePost(postId);
  const authorId = post.data?.authorId ?? "";
  const me = useMe();
  const rel = useRelationship(authorId);
  const [replyTo, setReplyTo] = useState<ReplyTarget | null>(null);

  if (post.isPending || rel.isPending) {
    return (
      <Screen>
        <LoadingState label="Loading post" testID="post-detail-loading" />
      </Screen>
    );
  }

  if (post.isError || !post.data) {
    return (
      <Screen testID="post-detail-screen">
        <EmptyState
          icon="alert"
          title="Bài viết không còn"
          description="It may have been deleted."
          testID="post-gone-title"
        />
      </Screen>
    );
  }

  if (rel.isError || !rel.data) {
    return (
      <Screen>
        <ErrorState
          title="Couldn't load author status"
          message="Check your connection and try again."
          testID="post-relationship-error"
          retryTestID="post-relationship-retry-button"
          onRetry={() => {
            void rel.refetch();
          }}
        />
      </Screen>
    );
  }

  const reason = getViewBlockReason(qc, authorId, me.data?.id ?? "");
  if (reason !== null) {
    return (
      <Screen>
        <EmptyState
          icon="lock"
          title={reason === "private" ? "Private account" : "Not available"}
          description="You can't see this post."
          testID={reason === "private" ? "private-empty-state" : "blocked-empty-state"}
        />
      </Screen>
    );
  }

  return (
    <Screen testID="post-detail-screen">
      <View style={styles.listFlex}>
        <CommentsList
          postId={postId}
          header={
            <PostCard
              postId={postId}
              onSafetyPress={() => {
                router.push(hrefs.report("post", postId));
              }}
              onOwnerEditPress={() => {
                router.push(hrefs.editPost(postId));
              }}
              onMentionPress={(handle) => {
                router.push(hrefs.user(handle));
              }}
              onHashtagPress={(tag) => {
                router.push(hrefs.hashtag(tag));
              }}
              saveAffordance={<SaveButton postId={postId} />}
            />
          }
          onReplyPress={(target) => {
            setReplyTo(target);
          }}
        />
      </View>
      <CommentComposer
        postId={postId}
        replyTo={replyTo}
        onClearReply={() => {
          setReplyTo(null);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  listFlex: {
    flex: 1,
  },
});

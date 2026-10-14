import { useLocalSearchParams } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { StyleSheet, View } from "react-native";

import { PostCard, usePost } from "@/entities/post";
import { getViewBlockReason, useMe, useRelationship } from "@/entities/user";
import { Button, Screen, Text } from "@/shared/ui";

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
        <Text variant="body">Missing post id.</Text>
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

  if (post.isPending || rel.isPending) {
    return (
      <Screen>
        <Text variant="body">Loading post…</Text>
      </Screen>
    );
  }

  if (post.isError || !post.data) {
    return (
      <Screen>
        <Text variant="body">Post not found.</Text>
      </Screen>
    );
  }

  if (rel.isError || !rel.data) {
    return (
      <Screen>
        <View style={styles.center}>
          <Text variant="body">Couldn&apos;t load author status.</Text>
          <Button
            title="Retry"
            testID="post-relationship-retry-button"
            onPress={() => {
              void rel.refetch();
            }}
          />
        </View>
      </Screen>
    );
  }

  const reason = getViewBlockReason(qc, authorId, me.data?.id ?? "");
  if (reason !== null) {
    return (
      <Screen>
        <View style={styles.center}>
          {reason === "private" ? (
            <Text variant="title" testID="private-empty-state">
              Private account
            </Text>
          ) : (
            <Text variant="title" testID="blocked-empty-state">
              Not available
            </Text>
          )}
          <Text variant="body">You can&apos;t see this post.</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <PostCard postId={postId} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
});

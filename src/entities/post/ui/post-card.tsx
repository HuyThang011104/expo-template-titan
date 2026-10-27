/**
 * Dumb post card.
 *
 * Takes `postId` and reads the canonical `usePost` + `usePostAuthor`.
 * Renders the author header inline to respect the boundary.
 */

import { Image } from "expo-image";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { formatRelative } from "@/shared/lib/date";
import { Avatar, Card, Icon, Skeleton, Text, useTheme } from "@/shared/ui";

import { usePost, usePostAuthor, useViewerId } from "../queries";
import { PostActions } from "./post-actions";
import { PostBody } from "./post-body";
import { PostOwnerMenu } from "./post-owner-menu";
import { PostShareButton } from "./post-share-button";
import { PostVideo } from "./post-video";

export type PostCardProps = {
  postId: string;
  testID?: string;
  /**
   * Safety entry point (F6). The card stays dumb: it only renders the
   * `...` affordance and calls back — navigation to `/report` is wired
   * by each feature screen, never by the entity.
   */
  onSafetyPress?: () => void;
  safetyTestID?: string;
  /**
   * Owner entry point (G1.3). When the viewer owns the post and this is
   * provided, the card renders the owner `...` menu (Sửa/Xóa) instead of
   * the safety one. Non-owners never see it; unknown viewer hides it
   * (fail-closed until `useMe` warms the `me` entry).
   */
  /**
   * Save affordance (G1.4). Cross-entity by design (`entities/saved` owns
   * the state), so features inject `<SaveButton postId />` — same pattern
   * as `onSafetyPress`/`onOwnerEditPress`. Share renders inline (post-owned).
   */
  onOwnerEditPress?: () => void;
  saveAffordance?: ReactNode;
  /**
   * Rich-text navigation (G1.5). Mention/hashtag taps are feature-owned
   * (same pattern as `onSafetyPress`); links confirm in-sheet before the
   * browser opens. Omitted callbacks render spans without a press handler.
   */
  onMentionPress?: (handle: string) => void;
  onHashtagPress?: (tag: string) => void;
  /**
   * Video orchestration (F7a). The feed passes viewability-driven
   * `isActive`; detail screens leave it `true` for single-video autoplay.
   */
  isVideoActive?: boolean;
};

const POST_IMAGE_HEIGHT = 200;

function PostAuthorHeader({ authorId }: { authorId: string }) {
  const authorQuery = usePostAuthor(authorId);

  if (authorQuery.isPending) {
    return (
      <View style={styles.authorRow}>
        <Skeleton width={40} height={40} radius="full" />
      </View>
    );
  }

  const author = authorQuery.data;
  if (!author) {
    return (
      <Text variant="label" color="textSecondary">
        Unknown user
      </Text>
    );
  }

  return (
    <View style={styles.authorRow}>
      <Avatar displayName={author.displayName} avatarUrl={author.avatarUrl} size={40} />
      <View style={styles.authorNames}>
        <Text variant="labelStrong">{author.displayName}</Text>
        <Text variant="caption" color="textSecondary">
          @{author.handle}
        </Text>
      </View>
    </View>
  );
}

export function PostCard({ postId, testID, onSafetyPress, safetyTestID, onOwnerEditPress, saveAffordance, onMentionPress, onHashtagPress, isVideoActive }: PostCardProps) {
  const theme = useTheme();
  const postQuery = usePost(postId);
  const viewerId = useViewerId();

  if (postQuery.isPending) {
    return (
      <Text variant="label" color="textSecondary" testID={testID}>
        Loading…
      </Text>
    );
  }

  const post = postQuery.data;
  if (postQuery.isError || !post) {
    return (
      <Text variant="label" color="textSecondary" testID={testID}>
        Post unavailable
      </Text>
    );
  }

  const firstMedia = post.media[0];
  const isOwner = !!viewerId && viewerId === post.authorId;
  return (
    <Card testID={testID} padding={3} style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.headerFlex}>
          <PostAuthorHeader authorId={post.authorId} />
        </View>
        {isOwner && onOwnerEditPress ? (
          <PostOwnerMenu postId={postId} onEditPress={onOwnerEditPress} />
        ) : onSafetyPress ? (
          <Pressable
            testID={safetyTestID ?? `safety-menu-${postId}`}
            accessibilityRole="button"
            accessibilityLabel="Post options"
            hitSlop={8}
            onPress={onSafetyPress}
            style={styles.safetyTouch}
          >
            <Icon name="more" size="md" color="textSecondary" />
          </Pressable>
        ) : null}
      </View>
      <PostBody
        postId={postId}
        body={post.body}
        onMentionPress={onMentionPress}
        onHashtagPress={onHashtagPress}
      />
      {firstMedia?.kind === "image" ? (
        <Image
          source={{ uri: firstMedia.url }}
          style={[styles.postImage, { borderRadius: theme.radius.md }]}
          contentFit="cover"
          transition={200}
        />
      ) : firstMedia?.kind === "video" ? (
        <PostVideo postId={postId} mediaUrl={firstMedia.url} isActive={isVideoActive ?? true} />
      ) : null}
      <PostActions postId={postId} testID={`like-button-${postId}`} />
      <View style={[styles.actionsRow, { gap: theme.space[4] }]}>
        {saveAffordance}
        <PostShareButton postId={postId} />
      </View>
      <Text variant="caption" color="textSecondary">
        {formatRelative(post.createdAt)}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 8,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerFlex: {
    flex: 1,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  safetyTouch: {
    padding: 4,
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  authorNames: {
    marginLeft: 12,
    justifyContent: "center",
  },
  postImage: {
    width: "100%",
    height: POST_IMAGE_HEIGHT,
  },
});

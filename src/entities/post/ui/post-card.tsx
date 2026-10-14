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
import { Text } from "@/shared/ui/text";
import { useTheme } from "@/shared/ui/theme/use-theme";

import { usePost, usePostAuthor, useViewerId } from "../queries";
import { PostActions } from "./post-actions";
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
   * Video orchestration (F7a). The feed passes viewability-driven
   * `isActive`; detail screens leave it `true` for single-video autoplay.
   */
  isVideoActive?: boolean;
};

const AUTHOR_AVATAR_SIZE = 40;
const POST_IMAGE_HEIGHT = 200;

function PostAuthorHeader({ authorId }: { authorId: string }) {
  const theme = useTheme();
  const authorQuery = usePostAuthor(authorId);

  if (authorQuery.isPending) {
    return (
      <View style={styles.authorRow}>
        <View
          style={[
            styles.authorAvatar,
            {
              backgroundColor: theme.color.backgroundElement,
              borderRadius: theme.radius.full,
            },
          ]}
        />
      </View>
    );
  }

  const author = authorQuery.data;
  if (!author) {
    return (
      <Text variant="small" color="textSecondary">
        Unknown user
      </Text>
    );
  }

  const shape = {
    width: AUTHOR_AVATAR_SIZE,
    height: AUTHOR_AVATAR_SIZE,
    borderRadius: theme.radius.full,
  };
  return (
    <View style={styles.authorRow}>
      {author.avatarUrl ? (
        <Image
          source={{ uri: author.avatarUrl }}
          style={shape}
          contentFit="cover"
          transition={200}
          accessibilityLabel={author.displayName}
        />
      ) : (
        <View
          style={[shape, styles.authorFallback, { backgroundColor: theme.color.backgroundElement }]}
          accessibilityRole="image"
          accessibilityLabel={author.displayName}
        >
          <Text variant="small" color="textSecondary" style={styles.authorInitial}>
            {(author.displayName.trim().slice(0, 1) || "?").toUpperCase()}
          </Text>
        </View>
      )}
      <View style={styles.authorNames}>
        <Text variant="small" style={styles.authorName}>
          {author.displayName}
        </Text>
        <Text variant="caption" color="textSecondary">
          @{author.handle}
        </Text>
      </View>
    </View>
  );
}

export function PostCard({ postId, testID, onSafetyPress, safetyTestID, onOwnerEditPress, saveAffordance, isVideoActive }: PostCardProps) {
  const theme = useTheme();
  const postQuery = usePost(postId);
  const viewerId = useViewerId();

  if (postQuery.isPending) {
    return (
      <Text variant="small" color="textSecondary" testID={testID}>
        Loading…
      </Text>
    );
  }

  const post = postQuery.data;
  if (postQuery.isError || !post) {
    return (
      <Text variant="small" color="textSecondary" testID={testID}>
        Post unavailable
      </Text>
    );
  }

  const firstMedia = post.media[0];
  const isOwner = !!viewerId && viewerId === post.authorId;
  return (
    <View testID={testID} style={[styles.card, { gap: theme.space.sm }]}>
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
            <Text variant="small" color="textSecondary" style={styles.safetyLabel}>
              …
            </Text>
          </Pressable>
        ) : null}
      </View>
      <Text variant="body">{post.body}</Text>
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
      <View style={styles.actionsRow}>
        {saveAffordance}
        <PostShareButton postId={postId} />
      </View>
      <Text variant="caption" color="textSecondary">
        {formatRelative(post.createdAt)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 12,
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
    gap: 16,
  },
  safetyTouch: {
    padding: 4,
  },
  safetyLabel: {
    fontWeight: "700",
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  authorAvatar: {
    width: AUTHOR_AVATAR_SIZE,
    height: AUTHOR_AVATAR_SIZE,
  },
  authorFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  authorInitial: {
    fontWeight: "700",
  },
  authorNames: {
    marginLeft: 12,
    justifyContent: "center",
  },
  authorName: {
    fontWeight: "700",
  },
  postImage: {
    width: "100%",
    height: POST_IMAGE_HEIGHT,
  },
});

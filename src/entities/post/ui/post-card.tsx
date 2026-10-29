/**
 * Dumb post card.
 *
 * Takes `postId` and reads the canonical `usePost` + `usePostAuthor`.
 * Renders the author header inline to respect the boundary.
 *
 * Spec: docs/feel-spec.md §4.1 (F5, F6, F14). Default surface is a flat row
 * on `background` with a hairline divider on the bottom (feed/search/profile);
 * `surface="card"` keeps the old framed look. Navigation and the comment
 * affordance are feature-owned callbacks — the entity never imports a router.
 */

import type { ReactNode } from "react";
import { useRef } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { formatRelative } from "@/shared/lib/date";
import { Avatar, Card, Icon, PressableScale, Skeleton, Text, useTheme } from "@/shared/ui";

import { usePost, usePostAuthor, useViewerId } from "../queries";
import { MediaGrid } from "./media-grid";
import { PostActions } from "./post-actions";
import { PostBody } from "./post-body";
import { PostOwnerMenu, type PostOwnerMenuHandle } from "./post-owner-menu";
import { PostVideo } from "./post-video";

export type PostCardProps = {
  postId: string;
  testID?: string;
  /**
   * Card press (navigation is feature-owned, same pattern as the other
   * callbacks). When omitted the card is not tappable.
   */
  onPress?: () => void;
  onPressIn?: () => void;
  /** Comment affordance (F14/PD4): feature opens detail with `focus=comment`. */
  onCommentPress?: () => void;
  /** Media affordance (F16): feature opens the viewer with `{ postId, index }`. */
  onMediaPress?: (index: number) => void;
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
  onOwnerEditPress?: () => void;
  /**
   * Save affordance (G1.4). Cross-entity by design (`entities/saved` owns
   * the state), so features inject `<SaveButton postId />` — same pattern
   * as `onSafetyPress`. Share renders inline (post-owned).
   */
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
  /** `flat` (default) is the feed row; `card` keeps the framed variant. */
  surface?: "flat" | "card";
};

function PostAuthorHeader({ authorId, timeLabel }: { authorId: string; timeLabel: string }) {
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
        <Text variant="labelStrong" numberOfLines={1}>
          {author.displayName}
        </Text>
        <Text variant="caption" color="textSecondary" numberOfLines={1}>
          {`@${author.handle} · ${timeLabel}`}
        </Text>
      </View>
    </View>
  );
}

export function PostCard({
  postId,
  testID,
  onPress,
  onPressIn,
  onCommentPress,
  onMediaPress,
  onSafetyPress,
  safetyTestID,
  onOwnerEditPress,
  saveAffordance,
  onMentionPress,
  onHashtagPress,
  isVideoActive,
  surface = "flat",
}: PostCardProps) {
  const theme = useTheme();
  const postQuery = usePost(postId);
  const viewerId = useViewerId();
  const ownerMenuRef = useRef<PostOwnerMenuHandle>(null);

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

  const isOwner = !!viewerId && viewerId === post.authorId;
  const [firstMedia] = post.media;
  const singleVideo = post.media.length === 1 && firstMedia?.kind === "video";

  function handleLongPress(): void {
    if (isOwner && onOwnerEditPress) {
      ownerMenuRef.current?.open();
      return;
    }
    onSafetyPress?.();
  }

  const content = (
    <>
      <View style={styles.headerRow}>
        <View style={styles.headerFlex}>
          <PostAuthorHeader authorId={post.authorId} timeLabel={formatRelative(post.createdAt)} />
        </View>
        {isOwner && onOwnerEditPress ? (
          <PostOwnerMenu postId={postId} onEditPress={onOwnerEditPress} ref={ownerMenuRef} />
        ) : onSafetyPress ? (
          <Pressable
            testID={safetyTestID ?? `safety-menu-${postId}`}
            accessibilityRole="button"
            accessibilityLabel="Post options"
            hitSlop={8}
            onPress={onSafetyPress}
            style={styles.safetyTouch}
          >
            <Icon name="more" size="md" color="textSecondary" decorative />
          </Pressable>
        ) : null}
      </View>
      <PostBody
        postId={postId}
        body={post.body}
        onMentionPress={onMentionPress}
        onHashtagPress={onHashtagPress}
      />
      {singleVideo && firstMedia ? (
        <PostVideo
          postId={postId}
          mediaUrl={firstMedia.url}
          isActive={isVideoActive ?? true}
        />
      ) : post.media.length > 0 ? (
        <MediaGrid
          media={post.media}
          onPress={onMediaPress}
          testID={`media-grid-${postId}`}
        />
      ) : null}
      <PostActions
        postId={postId}
        testID={`like-button-${postId}`}
        onCommentPress={onCommentPress}
        saveAffordance={saveAffordance}
      />
    </>
  );

  if (surface === "card") {
    return (
      <Card testID={testID} padding={3} style={styles.card}>
        {content}
      </Card>
    );
  }

  const flatStyle = [
    styles.flat,
    {
      backgroundColor: theme.color.background,
      borderBottomColor: theme.color.border,
    },
  ];

  if (!onPress) {
    return (
      <View testID={testID} style={flatStyle}>
        {content}
      </View>
    );
  }

  return (
    <PressableScale
      testID={testID}
      onPress={onPress}
      onPressIn={onPressIn}
      onLongPress={handleLongPress}
      delayLongPress={400}
      accessibilityRole="button"
      style={flatStyle}
    >
      {content}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  flat: {
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
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
  safetyTouch: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  authorNames: {
    flex: 1,
    marginLeft: 12,
    justifyContent: "center",
  },
});

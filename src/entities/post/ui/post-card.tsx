/**
 * Dumb post card.
 *
 * Takes `postId` and reads the canonical `usePost` + `usePostAuthor`.
 * Renders the author header inline to respect the boundary.
 *
 * Spec: docs/feel-spec.md §4.1 (F5, F6, F14). The default feed surface is a
 * flat row on `background` with a hairline divider: header/body/actions are
 * inset 16, media is full-bleed with no radius. `surface="card"` keeps the
 * framed look (inset + rounded media). Navigation and the comment/repost
 * affordances are feature-owned callbacks — the entity never imports a router.
 */

import type { ReactNode } from "react";
import { useRef } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { formatRelative } from "@/shared/lib/date";
import { Avatar, Card, PressableScale, Skeleton, Text, useTheme } from "@/shared/ui";

import { usePost, usePostAuthor, useViewerId } from "../queries";
import { MediaGrid } from "./media-grid";
import { PostActions } from "./post-actions";
import { PostBody } from "./post-body";
import { PostOptionsSheet, type PostOptionsSheetHandle } from "./post-options-sheet";
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
  /** Disables the scale/opacity feedback while keeping the card pressable. */
  disablePressAnimation?: boolean;
  /** Comment affordance (F14/PD4): feature opens detail with `focus=comment`. */
  onCommentPress?: () => void;
  /** Media affordance (F16): feature opens the viewer with `{ postId, index }`. */
  onMediaPress?: (index: number) => void;
  /** Repost affordance (F14). Backend lands later; feature owns the callback. */
  onRepostPress?: () => void;
  /** Options sheet hide row (F14). Feature filters the post out locally. */
  onHidePress?: () => void;
  /**
   * Owner entry point (G1.3). When the viewer owns the post and this is
   * provided, the card renders the owner `...` menu (Sửa/Xóa) instead of the
   * viewer options sheet. Non-owners never see it; unknown viewer hides it
   * (fail-closed until `useMe` warms the `me` entry).
   */
  onOwnerEditPress?: () => void;
  /**
   * Save affordance (G1.4). Cross-entity by design (`entities/saved` owns
   * the state), so features inject `<SaveButton variant="row" postId />`
   * and it renders inside the options sheet — not the action row.
   */
  saveAffordance?: ReactNode;
  /**
   * Rich-text navigation (G1.5). Mention/hashtag taps are feature-owned
   * (same pattern as the other callbacks); links confirm in-sheet before the
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
  disablePressAnimation = false,
  onCommentPress,
  onMediaPress,
  onRepostPress,
  onHidePress,
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
  const optionsMenuRef = useRef<PostOptionsSheetHandle>(null);

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
  const isFlat = surface === "flat";
  const sectionStyle = isFlat ? styles.sectionInset : undefined;

  function handleLongPress(): void {
    if (isOwner && onOwnerEditPress) {
      ownerMenuRef.current?.open();
      return;
    }
    optionsMenuRef.current?.open();
  }

  const content = (
    <>
      <View style={[styles.headerRow, sectionStyle]}>
        <View style={styles.headerFlex}>
          <PostAuthorHeader authorId={post.authorId} timeLabel={formatRelative(post.createdAt)} />
        </View>
        {isOwner && onOwnerEditPress ? (
          <PostOwnerMenu
            postId={postId}
            onEditPress={onOwnerEditPress}
            saveAffordance={saveAffordance}
            ref={ownerMenuRef}
          />
        ) : (
          <PostOptionsSheet
            postId={postId}
            onHidePress={onHidePress}
            saveAffordance={saveAffordance}
            ref={optionsMenuRef}
          />
        )}
      </View>
      {post.body.trim().length > 0 ? (
        <View style={sectionStyle}>
          <PostBody
            postId={postId}
            body={post.body}
            onMentionPress={onMentionPress}
            onHashtagPress={onHashtagPress}
          />
        </View>
      ) : null}
      {singleVideo && firstMedia ? (
        <View style={isFlat ? styles.mediaBleed : undefined}>
          <PostVideo
            postId={postId}
            mediaUrl={firstMedia.url}
            isActive={isVideoActive ?? true}
            rounded={!isFlat}
          />
        </View>
      ) : post.media.length > 0 ? (
        <MediaGrid
          media={post.media}
          variant={isFlat ? "feed" : "card"}
          onPress={onMediaPress}
          testID={`media-grid-${postId}`}
        />
      ) : null}
      <View style={sectionStyle}>
        <PostActions
          postId={postId}
          testID={`like-button-${postId}`}
          onCommentPress={onCommentPress}
          onRepostPress={onRepostPress}
        />
      </View>
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

  if (disablePressAnimation) {
    return (
      <Pressable
        testID={testID}
        onPress={onPress}
        onPressIn={onPressIn}
        onLongPress={handleLongPress}
        delayLongPress={400}
        accessibilityRole="button"
        style={flatStyle}
      >
        {content}
      </Pressable>
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
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  card: {
    gap: 8,
  },
  sectionInset: {
    paddingHorizontal: 16,
  },
  mediaBleed: {
    width: "100%",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerFlex: {
    flex: 1,
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

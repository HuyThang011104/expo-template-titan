/**
 * Notification row (F5 + PF5.1 + PF5.2).
 *
 * Reads the canonical `useNotification` + actor `useUser`; marking read
 * goes through the entity mutation (optimistic + rollback). Tapping a row
 * marks it read and follows the shared target link; rows without a
 * resolvable target stay in the list and only mark read.
 *
 * Anatomy follows the list-item pattern: avatar 40, actor + verb title,
 * relative time caption, trailing cluster (thumbnail + unread dot).
 * Unread tint fades out with `motion.base` once the row is read.
 *
 * The 44×44 thumbnail is cache-only (`getPostData`): no fetch, no skeleton,
 * no query per row. Missing post cache simply renders no thumbnail.
 */

import { useEffect } from "react";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import {
  resolveNotificationHref,
  useMarkNotificationRead,
  useNotification,
} from "@/entities/notification";
import { getPostData, type PostMedia } from "@/entities/post";
import { Avatar, useUser } from "@/entities/user";
import { formatRelative } from "@/shared/lib/date";
import { Badge, Icon, Skeleton, Text, useTheme } from "@/shared/ui";

import { logNotificationTap } from "../analytics";
import type { NotificationKind } from "@/entities/notification";

export type NotificationRowProps = {
  notificationId: string;
  prefetchTarget: (id: string) => void;
};

function verbFor(kind: NotificationKind): string {
  switch (kind) {
    case "like":
      return "liked your post";
    case "follow":
      return "started following you";
    case "post":
      return "shared a new post";
    case "mention":
      return "mentioned you";
  }
}

function wantsThumbnail(kind: NotificationKind): boolean {
  return kind === "like" || kind === "post" || kind === "mention";
}

function NotificationThumbnail({
  notificationId,
  media,
}: {
  notificationId: string;
  media: PostMedia | undefined;
}) {
  const theme = useTheme();

  if (!media) return null;

  const video = media.kind === "video";

  return (
    <View
      testID={`notification-thumb-${notificationId}`}
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.thumb, { borderRadius: theme.radius.sm }]}
    >
      {video ? (
        <View
          style={[styles.thumbFill, styles.videoThumb, { backgroundColor: theme.color.overlay }]}
        >
          <View style={[styles.playBadge, { backgroundColor: theme.color.primary }]}>
            <Icon name="play" size="sm" color="onPrimary" decorative />
          </View>
        </View>
      ) : (
        <Image
          source={{ uri: media.url }}
          style={styles.thumbFill}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={theme.motion.fast}
        />
      )}
    </View>
  );
}

function RowBody({
  notificationId,
  prefetchTarget,
}: {
  notificationId: string;
  prefetchTarget: (id: string) => void;
}) {
  const theme = useTheme();
  const qc = useQueryClient();
  const query = useNotification(notificationId);
  const markMutation = useMarkNotificationRead(notificationId);
  const reduceMotion = useReducedMotion();

  const unreadTint = useSharedValue(query.data?.read === false ? 1 : 0);

  useEffect(() => {
    if (!query.data) return;
    if (!query.data.read) {
      // Only the fade-out is animated; a row that becomes unread again
      // (rollback/refetch) shows its tint immediately.
      unreadTint.value = 1;
      return;
    }
    unreadTint.value = reduceMotion
      ? 0
      : withTiming(0, { duration: theme.motion.base });
  }, [query.data, reduceMotion, theme.motion.base, unreadTint]);

  const tintStyle = useAnimatedStyle(() => ({ opacity: unreadTint.value }));

  const actorId = query.data?.actorId ?? "";
  const actorQuery = useUser(actorId);

  const notification = query.data;
  if (query.isPending) {
    return (
      <View style={styles.row} testID={`notification-row-${notificationId}`}>
        <Skeleton width={40} height={40} radius="full" />
        <View style={styles.texts}>
          <Skeleton width={160} height={14} />
          <Skeleton width={80} height={12} />
        </View>
      </View>
    );
  }
  if (query.isError || !notification) {
    return (
      <Text variant="label" color="textSecondary" testID={`notification-row-${notificationId}`}>
        Notification unavailable
      </Text>
    );
  }

  const actorName = actorQuery.data?.displayName ?? "Someone";
  const postId = notification.postId;
  const thumbMedia =
    postId !== null && wantsThumbnail(notification.kind)
      ? getPostData(qc, postId)?.media[0]
      : undefined;

  return (
    <Pressable
      testID={`notification-row-${notificationId}`}
      accessibilityRole="button"
      accessibilityLabel={`${actorName} ${verbFor(notification.kind)}`}
      accessibilityState={{ busy: markMutation.isPending }}
      disabled={markMutation.isPending}
      onPressIn={() => {
        prefetchTarget(notificationId);
      }}
      onPress={() => {
        logNotificationTap(notificationId);
        markMutation.mutate();
        const href = resolveNotificationHref(qc, notification);
        if (href) router.push(href);
      }}
      style={[styles.row, markMutation.isPending && styles.marking]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: theme.color.primarySoft },
          tintStyle,
        ]}
      />
      <Avatar
        displayName={actorQuery.data?.displayName ?? "?"}
        avatarUrl={actorQuery.data?.avatarUrl ?? null}
        size={40}
      />
      <View style={styles.texts}>
        <Text variant="labelStrong" numberOfLines={2}>
          {actorName} {verbFor(notification.kind)}
        </Text>
        <Text variant="caption" color="textSecondary">
          {formatRelative(notification.createdAt)}
        </Text>
      </View>
      <View style={styles.trailing}>
        <NotificationThumbnail notificationId={notificationId} media={thumbMedia} />
        {!notification.read ? (
          <Badge
            variant="dot"
            tone="primary"
            testID={`notification-unread-${notificationId}`}
            accessibilityLabel="Unread"
          />
        ) : null}
      </View>
    </Pressable>
  );
}

export function NotificationRow({ notificationId, prefetchTarget }: NotificationRowProps) {
  return <RowBody notificationId={notificationId} prefetchTarget={prefetchTarget} />;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 64,
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  marking: {
    opacity: 0.6,
  },
  texts: {
    flex: 1,
    justifyContent: "center",
    gap: 2,
  },
  trailing: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  thumb: {
    width: 44,
    height: 44,
    overflow: "hidden",
  },
  thumbFill: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  videoThumb: {
    alignItems: "center",
    justifyContent: "center",
  },
  playBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
});

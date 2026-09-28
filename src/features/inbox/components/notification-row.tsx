/**
 * Notification row (F5).
 *
 * Reads the canonical `useNotification` + actor `useUser`; marking read
 * goes through the entity mutation (optimistic + rollback). Tapping a row
 * marks it read and follows the shared target link; rows without a
 * resolvable target stay in the list and only mark read.
 */

import { Link } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { Pressable, StyleSheet, View } from "react-native";

import {
  resolveNotificationHref,
  useMarkNotificationRead,
  useNotification,
} from "@/entities/notification";
import { Avatar, useUser } from "@/entities/user";
import { formatRelative } from "@/shared/lib/date";
import { Text, useTheme } from "@/shared/ui";

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

  const actorId = query.data?.actorId ?? "";
  const actorQuery = useUser(actorId);

  const notification = query.data;
  if (query.isPending) {
    return (
      <Text variant="small" color="textSecondary" testID={`notification-row-${notificationId}`}>
        Loading…
      </Text>
    );
  }
  if (query.isError || !notification) {
    return (
      <Text variant="small" color="textSecondary" testID={`notification-row-${notificationId}`}>
        Notification unavailable
      </Text>
    );
  }

  const actorName = actorQuery.data?.displayName ?? "Someone";
  const content = (
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
      }}
      style={[styles.row, markMutation.isPending && styles.marking]}
    >
      <Avatar
        displayName={actorQuery.data?.displayName ?? "?"}
        avatarUrl={actorQuery.data?.avatarUrl ?? null}
        size={40}
      />
      <View style={styles.texts}>
        <Text variant="small" style={styles.title}>
          {actorName} {verbFor(notification.kind)}
        </Text>
        <Text variant="caption" color="textSecondary">
          {formatRelative(notification.createdAt)}
        </Text>
      </View>
      {!notification.read ? (
        <View
          testID={`notification-unread-${notificationId}`}
          accessibilityLabel="Unread"
          style={[styles.dot, { backgroundColor: theme.color.primary }]}
        />
      ) : null}
    </Pressable>
  );

  const href = resolveNotificationHref(qc, notification);
  if (!href) return content;
  return (
    <Link href={href} asChild>
      {content}
    </Link>
  );
}

export function NotificationRow({ notificationId, prefetchTarget }: NotificationRowProps) {
  return <RowBody notificationId={notificationId} prefetchTarget={prefetchTarget} />;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
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
  },
  title: {
    fontWeight: "700",
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});

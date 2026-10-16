/**
 * Message bubble (F4 + G3.1). Dumb: reads the canonical `useMessage`.
 * Own messages align right; others align left with sender name.
 * G3.1: optional image via `AppImage`; own status shows
 * `Đang gửi` (sending) / `Đã gửi` (sent) / `Đã xem` (seen).
 */

import { StyleSheet, View } from "react-native";

import { useMessage } from "@/entities/conversation";
import { useUser } from "@/entities/user";
import { formatRelative } from "@/shared/lib/date";
import { AppImage } from "@/shared/media";
import { Text, useTheme } from "@/shared/ui";

export type MessageBubbleProps = {
  conversationId: string;
  messageId: string;
};

const STATUS_LABEL: Record<string, string> = {
  sending: "Đang gửi",
  sent: "Đã gửi",
  seen: "Đã xem",
};

export function MessageBubble({ conversationId, messageId }: MessageBubbleProps) {
  const theme = useTheme();
  const query = useMessage(conversationId, messageId);
  const senderQuery = useUser(query.data?.senderId ?? "");

  if (query.isPending) {
    return (
      <Text variant="caption" color="textSecondary" testID={`message-${messageId}`}>
        ...
      </Text>
    );
  }
  if (query.isError || !query.data) {
    return (
      <Text variant="caption" color="textSecondary" testID={`message-${messageId}`}>
        Message unavailable
      </Text>
    );
  }

  const message = query.data;
  const mine = message.senderId === "me";
  const senderName = mine ? "You" : (senderQuery.data?.displayName ?? "Someone");
  const statusLabel = mine ? (STATUS_LABEL[message.status] ?? null) : null;

  return (
    <View
      testID={`message-${messageId}`}
      style={[styles.wrapper, mine ? styles.mineWrapper : styles.theirsWrapper]}
    >
      {!mine ? (
        <Text variant="caption" color="textSecondary">
          {senderName}
        </Text>
      ) : null}
      {message.imageUrl ? (
        <AppImage
          uri={message.imageUrl}
          testID={`message-image-${messageId}`}
          accessibilityLabel="Attached image"
          style={styles.image}
        />
      ) : null}
      {message.body ? (
        <View
          style={[
            styles.bubble,
            mine
              ? { backgroundColor: theme.color.primary }
              : { backgroundColor: theme.color.backgroundElement },
          ]}
        >
          <Text variant="body" color={mine ? "onPrimary" : undefined}>
            {message.body}
          </Text>
        </View>
      ) : null}
      <View style={styles.metaRow}>
        <Text variant="caption" color="textSecondary">
          {formatRelative(message.createdAt)}
        </Text>
        {statusLabel ? (
          <Text
            variant="caption"
            color="textSecondary"
            testID={`message-status-${messageId}`}
          >
            {" · "}
            {statusLabel}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    maxWidth: "80%",
    gap: 4,
  },
  mineWrapper: {
    alignSelf: "flex-end",
    alignItems: "flex-end",
  },
  theirsWrapper: {
    alignSelf: "flex-start",
    alignItems: "flex-start",
  },
  bubble: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  image: {
    width: 220,
    height: 160,
    borderRadius: 12,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
  },
});

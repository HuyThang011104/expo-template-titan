/**
 * Message bubble (F4). Dumb: reads the canonical `useMessage`.
 * Own messages align right; others align left with sender name.
 */

import { StyleSheet, View } from "react-native";

import { useMessage } from "@/entities/conversation";
import { useUser } from "@/entities/user";
import { formatRelative } from "@/shared/lib/date";
import { Text, useTheme } from "@/shared/ui";

export type MessageBubbleProps = {
  conversationId: string;
  messageId: string;
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
      <Text variant="caption" color="textSecondary">
        {formatRelative(message.createdAt)}
      </Text>
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
});

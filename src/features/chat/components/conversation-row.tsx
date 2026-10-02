/**
 * Conversation row (F4).
 *
 * Reads the canonical `useConversation`; tapping warms the thread and
 * follows the shared chat link. Unread shows a count badge.
 */

import { Link } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { useConversation } from "@/entities/conversation";
import { Avatar, useUser } from "@/entities/user";
import { hrefs } from "@/shared/navigation/hrefs";
import { formatRelative } from "@/shared/lib/date";
import { Text, useTheme } from "@/shared/ui";

import { logChatOpenThread } from "../analytics";

export type ConversationRowProps = {
  conversationId: string;
  prefetchThread: (id: string) => void;
};

export function ConversationRow({ conversationId, prefetchThread }: ConversationRowProps) {
  const theme = useTheme();
  const query = useConversation(conversationId);

  const participantId = query.data?.participantIds[0] ?? "";
  const userQuery = useUser(participantId);

  if (query.isPending) {
    return (
      <Text variant="small" color="textSecondary" testID={`conversation-row-${conversationId}`}>
        Loading...
      </Text>
    );
  }
  if (query.isError || !query.data) {
    return (
      <Text variant="small" color="textSecondary" testID={`conversation-row-${conversationId}`}>
        Conversation unavailable
      </Text>
    );
  }

  const conversation = query.data;
  const displayName = userQuery.data?.displayName ?? conversation.title;

  return (
    <Link href={hrefs.chat(conversationId)} asChild>
      <Pressable
        testID={`conversation-row-${conversationId}`}
        accessibilityRole="button"
        accessibilityLabel={`Open chat with ${displayName}`}
        onPressIn={() => {
          logChatOpenThread(conversationId);
          prefetchThread(conversationId);
        }}
        style={styles.row}
      >
        <Avatar
          displayName={displayName}
          avatarUrl={userQuery.data?.avatarUrl ?? null}
          size={48}
        />
        <View style={styles.texts}>
          <Text variant="small" style={styles.title}>
            {displayName}
          </Text>
          <Text variant="caption" color="textSecondary" numberOfLines={1}>
            {conversation.lastMessagePreview}
          </Text>
        </View>
        <View style={styles.meta}>
          <Text variant="caption" color="textSecondary">
            {formatRelative(conversation.lastMessageAt)}
          </Text>
          {conversation.unreadCount > 0 ? (
            <View
              testID={`conversation-unread-${conversationId}`}
              style={[styles.badge, { backgroundColor: theme.color.primary }]}
            >
              <Text variant="caption" color="onPrimary" style={styles.badgeText}>
                {conversation.unreadCount > 99 ? "99+" : String(conversation.unreadCount)}
              </Text>
            </View>
          ) : null}
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  texts: {
    flex: 1,
    justifyContent: "center",
  },
  title: {
    fontWeight: "700",
  },
  meta: {
    alignItems: "flex-end",
    gap: 4,
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  badgeText: {
    fontWeight: "700",
  },
});

/**
 * Conversation row (F4 + G3.2).
 *
 * Reads the canonical `useConversation`; tapping warms the thread and
 * follows the shared chat link. Unread shows a count badge.
 * G3.2: peer online dot on the avatar; typing replaces the preview with
 * `Đang nhập...` while the TTL is fresh.
 */

import { Link } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { useConversation, useTypingIn } from "@/entities/conversation";
import { Avatar, useUser } from "@/entities/user";
import { hrefs } from "@/shared/navigation/hrefs";
import { formatRelative } from "@/shared/lib/date";
import { Badge, Skeleton, Text } from "@/shared/ui";

import { logChatOpenThread } from "../analytics";
import { usePresenceChannel } from "../realtime/use-presence-channel";
import { PresenceDot } from "./presence-dot";

export type ConversationRowProps = {
  conversationId: string;
  prefetchThread: (id: string) => void;
};

export function ConversationRow({ conversationId, prefetchThread }: ConversationRowProps) {
  const query = useConversation(conversationId);

  const participantId = query.data?.participantIds[0] ?? "";
  const userQuery = useUser(participantId);
  usePresenceChannel(participantId || null);
  const peerTyping = useTypingIn(conversationId, participantId);

  if (query.isPending) {
    return (
      <View style={styles.row} testID={`conversation-row-${conversationId}`}>
        <Skeleton width={48} height={48} radius="full" />
        <View style={styles.texts}>
          <Skeleton width={120} height={14} />
          <Skeleton width={160} height={12} />
        </View>
      </View>
    );
  }
  if (query.isError || !query.data) {
    return (
      <Text variant="label" color="textSecondary" testID={`conversation-row-${conversationId}`}>
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
        <View style={styles.avatarWrap}>
          <Avatar
            displayName={displayName}
            avatarUrl={userQuery.data?.avatarUrl ?? null}
            size={48}
          />
          {participantId ? (
            <View style={styles.dot}>
              <PresenceDot userId={participantId} />
            </View>
          ) : null}
        </View>
        <View style={styles.texts}>
          <Text variant="labelStrong">{displayName}</Text>
          {peerTyping ? (
            <Text
              variant="caption"
              color="textSecondary"
              numberOfLines={1}
              testID={`conversation-typing-${conversationId}`}
            >
              Typing…
            </Text>
          ) : (
            <Text variant="caption" color="textSecondary" numberOfLines={1}>
              {conversation.lastMessagePreview}
            </Text>
          )}
        </View>
        <View style={styles.meta}>
          <Text variant="caption" color="textSecondary">
            {formatRelative(conversation.lastMessageAt)}
          </Text>
          {conversation.unreadCount > 0 ? (
            <Badge
              variant="count"
              tone="primary"
              count={conversation.unreadCount}
              testID={`conversation-unread-${conversationId}`}
              accessibilityLabel={`${conversation.unreadCount} unread messages`}
            />
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
    gap: 4,
  },
  meta: {
    alignItems: "flex-end",
    gap: 4,
  },
  avatarWrap: {
    position: "relative",
  },
  dot: {
    position: "absolute",
    right: -2,
    bottom: -2,
  },
});

/**
 * Chat detail screen (F4).
 *
 * - Header reads the canonical conversation; marking read resets the badge.
 * - Messages paginate older pages; composer sends optimistically.
 * - Draft survives remount via sqlite; socket stub appends live messages.
 */

import { useEffect } from "react";
import { useLocalSearchParams } from "expo-router";
import { KeyboardAvoidingView, StyleSheet, View } from "react-native";

import { markConversationRead } from "@/entities/conversation";
import { Button, Screen, Text } from "@/shared/ui";
import { useQueryClient } from "@tanstack/react-query";

import { logChatSend } from "../analytics";
import { ChatComposer } from "../components/chat-composer";
import { MessageList } from "../components/message-list";
import { useChatDraft } from "../hooks/use-chat-draft";
import { useChatThread } from "../queries/use-chat-thread";
import { useConversationChannel } from "../realtime/use-conversation-channel";

export function ChatDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const conversationId = typeof id === "string" ? id : "";
  const qc = useQueryClient();
  const thread = useChatThread(conversationId);
  const draft = useChatDraft(conversationId);

  useConversationChannel(conversationId || null);

  useEffect(() => {
    if (conversationId && thread.conversation.data) {
      markConversationRead(qc, conversationId);
    }
  }, [qc, conversationId, thread.conversation.data]);

  if (!conversationId) {
    return (
      <Screen style={styles.center}>
        <Text variant="body">Missing chat id.</Text>
      </Screen>
    );
  }

  const handleSend = () => {
    const body = draft.body.trim();
    if (!body || thread.isSending) return;
    logChatSend(conversationId);
    thread.send(body);
    void draft.clear();
  };

  if (thread.conversation.isPending || thread.messages.isPending) {
    return (
      <Screen testID="chat-detail-screen">
        <Text variant="body" testID="chat-thread-loading">
          Loading conversation...
        </Text>
      </Screen>
    );
  }

  if (thread.conversation.isError || thread.messages.isError) {
    return (
      <Screen style={styles.center} testID="chat-detail-screen">
        <Text variant="title">Chat</Text>
        <Text variant="body">Could not load this conversation.</Text>
        <Button
          title="Retry"
          testID="chat-thread-retry"
          onPress={() => {
            void thread.conversation.refetch();
            void thread.messages.refetch();
          }}
        />
      </Screen>
    );
  }

  return (
    <Screen testID="chat-detail-screen">
      <KeyboardAvoidingView style={styles.flex} behavior="padding" keyboardVerticalOffset={80}>
        <View style={styles.flex}>
          <MessageList
            conversationId={conversationId}
            messageIds={thread.messageIds}
            isFetchingNextPage={thread.messages.isFetchingNextPage}
            isRefetching={thread.messages.isRefetching}
            onLoadOlder={() => {
              if (thread.messages.hasNextPage && !thread.messages.isFetchingNextPage) {
                void thread.messages.fetchNextPage();
              }
            }}
            onRefresh={() => {
              void thread.messages.refetch();
            }}
          />
        </View>
        <ChatComposer
          value={draft.body}
          onChange={draft.setBody}
          onSend={handleSend}
          isSending={thread.isSending}
        />
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
});

/**
 * Chat detail screen (F4 + G3.1 + G3.2 + G3.3).
 *
 * - Header reads the canonical conversation; opening marks read + seen.
 * - G3.2: peer presence (online/offline) + `Đang nhập...` with TTL;
 *   composer keystrokes emit throttled typing events.
 * - G3.3: sends go through `useChatSend` (offline taps park as `Queued`
 *   + one outbox job; the badge clears only after the drain confirms).
 *   Draft/image clear only after sent-or-queued — never a silent loss.
 * - Messages paginate older pages; composer sends text and/or one image.
 * - Draft survives remount via sqlite; socket stub appends live messages (dedup by id).
 * - Image errors render inline and keep the typed text.
 */

import { useEffect, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { KeyboardAvoidingView, StyleSheet, View } from "react-native";

import { countQueuedMessages, markThreadRead, usePresence } from "@/entities/conversation";
import { canMessageTarget, useMe, useUser } from "@/entities/user";
import { formatRelative } from "@/shared/lib/date";
import { ErrorState, LoadingState, Screen, Text } from "@/shared/ui";
import { useQueryClient } from "@tanstack/react-query";

import { logChatSend } from "../analytics";
import { ChatComposer } from "../components/chat-composer";
import { MessageList } from "../components/message-list";
import { TypingIndicator } from "../components/typing-indicator";
import { useChatDraft } from "../hooks/use-chat-draft";
import { useChatImage } from "../hooks/use-chat-image";
import { useChatSend } from "../mutations/use-chat-send";
import { useChatThread } from "../queries/use-chat-thread";
import { useConversationChannel } from "../realtime/use-conversation-channel";
import { usePresenceChannel } from "../realtime/use-presence-channel";
import { useSendTyping } from "../realtime/use-send-typing";

export function ChatDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const conversationId = typeof id === "string" ? id : "";
  const qc = useQueryClient();
  const thread = useChatThread(conversationId);
  const draft = useChatDraft(conversationId);
  const image = useChatImage();
  const chatSend = useChatSend(conversationId);
  const [sendError, setSendError] = useState<string | null>(null);

  useConversationChannel(conversationId || null);
  const typing = useSendTyping(conversationId || null);

  // G2.3: respect the peer's messageAudience (everyone/following/none).
  // Privacy warms through `useUser`; unknown entries fail open.
  // Hooks stay above all early returns.
  const me = useMe();
  const participantId = thread.conversation.data?.participantIds[0] ?? "";
  const peerQuery = useUser(participantId);
  usePresenceChannel(participantId || null);
  const presenceQuery = usePresence(participantId);
  const messageAllowed =
    !participantId || !conversationId || canMessageTarget(qc, participantId, me.data?.id ?? "");

  // Open thread = read: badge drops + loaded messages flip to `seen`,
  // then best-effort sync the receipt (local state never rolls back).
  useEffect(() => {
    if (conversationId && thread.conversation.data) {
      void markThreadRead(qc, conversationId);
    }
  }, [qc, conversationId, thread.conversation.data]);

  // Live peer message while viewing: show immediately (socket) + mark seen.
  useEffect(() => {
    if (conversationId && thread.messageIds.length > 0 && thread.conversation.data) {
      void markThreadRead(qc, conversationId);
    }
  }, [qc, conversationId, thread.conversation.data, thread.messageIds.length]);

  if (!conversationId) {
    return (
      <Screen style={styles.center}>
        <Text variant="body">Missing chat id.</Text>
      </Screen>
    );
  }

  const handleChange = (next: string) => {
    draft.setBody(next);
    if (next.trim().length > 0) typing.sendTyping();
    else typing.stopTyping();
  };

  const queuedCount = conversationId ? countQueuedMessages(qc, conversationId) : 0;

  const handleSend = () => {
    const body = draft.body.trim();
    if ((!body && !image.asset) || chatSend.isSending || !messageAllowed) return;
    setSendError(null);
    logChatSend(conversationId);
    typing.stopTyping();
    // Upload-when-online / park-when-offline both live in `useChatSend`;
    // the typed text + picked image clear only after sent-or-queued.
    const task = image.asset
      ? chatSend.send({ body, localImageUri: image.asset.uri })
      : chatSend.send({ body });
    task
      .then(() => {
        void draft.clear();
        image.remove();
      })
      .catch((error: unknown) => {
        // Loud failure (blocked / upload / server) — text stays, badge explains.
        setSendError(
          error instanceof Error ? error.message : "Không gửi được tin nhắn. Thử lại.",
        );
      });
  };

  if (thread.conversation.isPending || thread.messages.isPending) {
    return (
      <Screen testID="chat-detail-screen">
        <LoadingState label="Loading conversation" testID="chat-thread-loading" />
      </Screen>
    );
  }

  if (thread.conversation.isError || thread.messages.isError) {
    return (
      <Screen testID="chat-detail-screen">
        <ErrorState
          title="Couldn't load this conversation"
          message="Check your connection and try again."
          testID="chat-thread-error"
          retryTestID="chat-thread-retry"
          onRetry={() => {
            void thread.conversation.refetch();
            void thread.messages.refetch();
          }}
        />
      </Screen>
    );
  }

  const peerName =
    peerQuery.data?.displayName ?? thread.conversation.data?.title ?? "Chat";
  const presence = presenceQuery.data;
  const statusText = presence?.online
    ? "Online"
    : presence?.lastSeenAt
      ? `Offline · ${formatRelative(presence.lastSeenAt)}`
      : "Offline";

  return (
    <Screen testID="chat-detail-screen">
      <KeyboardAvoidingView style={styles.flex} behavior="padding" keyboardVerticalOffset={80}>
        <View style={styles.header} testID="chat-peer-header">
          <Text variant="small" style={styles.peerName}>
            {peerName}
          </Text>
          {participantId ? (
            <Text variant="caption" color="textSecondary" testID="chat-peer-status">
              {statusText}
            </Text>
          ) : null}
          {participantId ? (
            <TypingIndicator conversationId={conversationId} userId={participantId} />
          ) : null}
        </View>
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
        {!messageAllowed ? (
          <Text
            variant="caption"
            color="textSecondary"
            testID="chat-blocked-notice"
            style={styles.blockedNotice}
          >
            Bạn không thể nhắn tin cho người này.
          </Text>
        ) : null}
        {queuedCount > 0 ? (
          <Text
            variant="caption"
            color="textSecondary"
            testID="chat-queued-badge"
            style={styles.blockedNotice}
          >
            Queued — will send when online.
          </Text>
        ) : null}
        {sendError ? (
          <Text
            variant="caption"
            color="textSecondary"
            testID="chat-send-error"
            style={styles.blockedNotice}
          >
            {sendError}
          </Text>
        ) : null}
        <ChatComposer
          value={draft.body}
          onChange={handleChange}
          onSend={handleSend}
          isSending={chatSend.isSending}
          sendDisabled={!messageAllowed}
          imageUri={image.asset?.uri ?? null}
          imageError={image.error}
          isPickingImage={image.picking}
          isUploadingImage={false}
          onPickImage={() => {
            void image.pick();
          }}
          onRemoveImage={image.remove}
        />
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 2,
  },
  peerName: {
    fontWeight: "700",
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  blockedNotice: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    textAlign: "center",
  },
});

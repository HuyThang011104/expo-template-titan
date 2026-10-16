/**
 * Chat detail screen (F4 + G3.1).
 *
 * - Header reads the canonical conversation; opening marks read + seen.
 * - Messages paginate older pages; composer sends text and/or one image.
 * - Draft survives remount via sqlite; socket stub appends live messages (dedup by id).
 * - Image errors render inline and keep the typed text.
 */

import { useEffect, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { KeyboardAvoidingView, StyleSheet, View } from "react-native";

import { markConversationRead, markMessagesSeen } from "@/entities/conversation";
import { canMessageTarget, useMe, useUser } from "@/entities/user";
import { uploadMedia } from "@/shared/media";
import { Button, Screen, Text } from "@/shared/ui";
import { useQueryClient } from "@tanstack/react-query";

import { logChatSend } from "../analytics";
import { ChatComposer } from "../components/chat-composer";
import { MessageList } from "../components/message-list";
import { useChatDraft } from "../hooks/use-chat-draft";
import { useChatImage } from "../hooks/use-chat-image";
import { useChatThread } from "../queries/use-chat-thread";
import { useConversationChannel } from "../realtime/use-conversation-channel";

export function ChatDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const conversationId = typeof id === "string" ? id : "";
  const qc = useQueryClient();
  const thread = useChatThread(conversationId);
  const draft = useChatDraft(conversationId);
  const image = useChatImage();
  const [uploading, setUploading] = useState(false);

  useConversationChannel(conversationId || null);

  // Open thread = read: badge drops + loaded messages flip to `seen`.
  useEffect(() => {
    if (conversationId && thread.conversation.data) {
      markConversationRead(qc, conversationId);
      markMessagesSeen(qc, conversationId);
    }
  }, [qc, conversationId, thread.conversation.data]);

  // Live peer message while viewing: show immediately (socket) + mark seen.
  useEffect(() => {
    if (conversationId && thread.messageIds.length > 0 && thread.conversation.data) {
      markConversationRead(qc, conversationId);
      markMessagesSeen(qc, conversationId);
    }
  }, [qc, conversationId, thread.conversation.data, thread.messageIds.length]);

  // G2.3: respect the peer's messageAudience (everyone/following/none).
  // Privacy warms through `useUser`; unknown entries fail open.
  // Hooks stay above all early returns.
  const me = useMe();
  const participantId = thread.conversation.data?.participantIds[0] ?? "";
  useUser(participantId);
  const messageAllowed =
    !participantId || !conversationId || canMessageTarget(qc, participantId, me.data?.id ?? "");

  if (!conversationId) {
    return (
      <Screen style={styles.center}>
        <Text variant="body">Missing chat id.</Text>
      </Screen>
    );
  }

  const handleSend = () => {
    const body = draft.body.trim();
    if ((!body && !image.asset) || thread.isSending || uploading || !messageAllowed) return;
    logChatSend(conversationId);
    if (image.asset) {
      const asset = image.asset;
      setUploading(true);
      void uploadMedia(asset)
        .then((uploaded) => thread.sendAsync({ body, imageUrl: uploaded.url }))
        .then(() => {
          void draft.clear();
          image.remove();
        })
        .catch(() => {
          // Keep the typed text; surface the upload failure inline.
          image.setInlineError("Tải ảnh lên thất bại. Hãy thử lại, nội dung đã gõ vẫn giữ nguyên.");
        })
        .finally(() => {
          setUploading(false);
        });
      return;
    }
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
        <ChatComposer
          value={draft.body}
          onChange={draft.setBody}
          onSend={handleSend}
          isSending={thread.isSending}
          sendDisabled={!messageAllowed}
          imageUri={image.asset?.uri ?? null}
          imageError={image.error}
          isPickingImage={image.picking}
          isUploadingImage={uploading}
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

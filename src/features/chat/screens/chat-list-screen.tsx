/**
 * Chat list screen (F4).
 *
 * - Reads threads with `useChatList` (entity-backed infinite list).
 * - First-page pending shows text; errors show retry.
 */

import { useEffect } from "react";
import { StyleSheet } from "react-native";

import { Button, Screen, Text } from "@/shared/ui";

import { logChatOpenList } from "../analytics";
import { ConversationList } from "../components/conversation-list";
import { useChatList } from "../queries/use-conversations";

export function ChatListScreen() {
  const list = useChatList();

  useEffect(() => {
    logChatOpenList();
  }, []);

  if (list.isPending) {
    return (
      <Screen testID="chat-list-screen">
        <Text variant="body" testID="chat-loading">
          Loading chats...
        </Text>
      </Screen>
    );
  }

  if (list.isError) {
    return (
      <Screen style={styles.center} testID="chat-list-screen">
        <Text variant="title">Chats</Text>
        <Text variant="body">Could not load your conversations.</Text>
        <Button
          title="Retry"
          testID="chat-retry-button"
          onPress={() => {
            void list.refetch();
          }}
        />
      </Screen>
    );
  }

  return (
    <Screen testID="chat-list-screen">
      <ConversationList
        conversationIds={list.conversationIds}
        isFetchingNextPage={list.isFetchingNextPage}
        isRefetching={list.isRefetching}
        onEndReached={() => {
          if (list.hasNextPage && !list.isFetchingNextPage) void list.fetchNextPage();
        }}
        onRefresh={() => {
          void list.refetch();
        }}
        prefetchThread={list.prefetchThread}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
});

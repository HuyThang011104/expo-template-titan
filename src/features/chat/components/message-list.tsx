/**
 * Message list (F4). Chronological `FlashList` (oldest first).
 * FlashList v2 has no `inverted` prop, so newest sits last and older
 * pages prepend via `onEndReached` at the top threshold.
 */

import { FlashList } from "@shopify/flash-list";
import { StyleSheet, View } from "react-native";

import { EmptyState, LoadingState } from "@/shared/ui";

import { MessageBubble } from "./message-bubble";

export type MessageListProps = {
  conversationId: string;
  messageIds: string[];
  isFetchingNextPage: boolean;
  isRefetching: boolean;
  onLoadOlder: () => void;
  onRefresh: () => void;
};

export function MessageList({
  conversationId,
  messageIds,
  isFetchingNextPage,
  isRefetching,
  onLoadOlder,
  onRefresh,
}: MessageListProps) {
  return (
    <FlashList
      testID="message-list"
      data={messageIds}
      renderItem={({ item }) => (
        <MessageBubble conversationId={conversationId} messageId={item} />
      )}
      keyExtractor={(id) => id}
      onEndReached={onLoadOlder}
      onEndReachedThreshold={0.5}
      onRefresh={onRefresh}
      refreshing={isRefetching}
      ListEmptyComponent={
        <EmptyState
          icon="comment"
          title="Say hello"
          description="Send the first message to start the conversation."
          testID="message-empty"
        />
      }
      ListFooterComponent={
        isFetchingNextPage ? (
          <LoadingState label="Loading older messages" style={styles.footer} />
        ) : null
      }
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      contentContainerStyle={styles.content}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  footer: {
    paddingVertical: 16,
  },
  separator: {
    height: 8,
  },
});

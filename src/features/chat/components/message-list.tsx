/**
 * Message list (F4). Chronological `FlashList` (oldest first).
 * FlashList v2 has no `inverted` prop, so newest sits last and older
 * pages prepend via `onEndReached` at the top threshold.
 */

import { FlashList } from "@shopify/flash-list";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { Text, useTheme } from "@/shared/ui";

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
  const theme = useTheme();

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
        <View style={styles.empty}>
          <Text variant="body" testID="message-empty">
            Say hello to start the conversation.
          </Text>
        </View>
      }
      ListFooterComponent={
        isFetchingNextPage ? (
          <ActivityIndicator color={theme.color.primary} style={styles.footer} />
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
  empty: {
    alignItems: "center",
    padding: 24,
  },
  footer: {
    padding: 16,
  },
  separator: {
    height: 8,
  },
});

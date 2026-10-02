/**
 * Conversation list — the single `FlashList` that renders chats.
 *
 * - `data` is a flat `conversationIds` array read via canonical row.
 */

import { FlashList } from "@shopify/flash-list";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { Text, useTheme } from "@/shared/ui";

import { ConversationRow } from "./conversation-row";

export type ConversationListProps = {
  conversationIds: string[];
  isFetchingNextPage: boolean;
  isRefetching: boolean;
  onEndReached: () => void;
  onRefresh: () => void;
  prefetchThread: (id: string) => void;
};

function ChatEmpty() {
  return (
    <View style={styles.empty}>
      <Text variant="body" testID="chat-empty">
        No conversations yet.
      </Text>
    </View>
  );
}

export function ConversationList({
  conversationIds,
  isFetchingNextPage,
  isRefetching,
  onEndReached,
  onRefresh,
  prefetchThread,
}: ConversationListProps) {
  const theme = useTheme();

  return (
    <FlashList
      testID="chat-list"
      data={conversationIds}
      renderItem={({ item }) => (
        <ConversationRow conversationId={item} prefetchThread={prefetchThread} />
      )}
      keyExtractor={(id) => id}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      onRefresh={onRefresh}
      refreshing={isRefetching}
      ListEmptyComponent={<ChatEmpty />}
      ListFooterComponent={
        isFetchingNextPage ? (
          <ActivityIndicator color={theme.color.primary} style={styles.footer} />
        ) : null
      }
      ItemSeparatorComponent={() => <View style={styles.separator} />}
    />
  );
}

const styles = StyleSheet.create({
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

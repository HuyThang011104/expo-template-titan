/**
 * Conversation list — the single `FlashList` that renders chats.
 *
 * - `data` is a flat `conversationIds` array read via canonical row.
 */

import { FlashList } from "@shopify/flash-list";
import { StyleSheet, View } from "react-native";

import { EmptyState, LoadingState } from "@/shared/ui";

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
    <EmptyState
      icon="comment"
      title="No conversations yet"
      description="Start a chat from a profile to see it here."
      testID="chat-empty"
    />
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
          <LoadingState label="Loading more conversations" style={styles.footer} />
        ) : null
      }
      ItemSeparatorComponent={() => <View style={styles.separator} />}
    />
  );
}

const styles = StyleSheet.create({
  footer: {
    paddingVertical: 16,
  },
  separator: {
    height: 8,
  },
});

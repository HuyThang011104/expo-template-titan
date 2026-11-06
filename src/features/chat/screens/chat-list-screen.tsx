/**
 * Chat list screen (F4).
 *
 * - Reads threads with `useChatList` (entity-backed infinite list).
 * - First-page pending shows text; errors show retry.
 */

import { useEffect } from "react";

import { ErrorState, LoadingState, Screen } from "@/shared/ui";

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
        <LoadingState label="Loading chats" testID="chat-loading" />
      </Screen>
    );
  }

  if (list.isError) {
    return (
      <Screen testID="chat-list-screen">
        <ErrorState
          title="Couldn't load your conversations"
          message="Check your connection and try again."
          testID="chat-error"
          retryTestID="chat-retry-button"
          onRetry={() => {
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


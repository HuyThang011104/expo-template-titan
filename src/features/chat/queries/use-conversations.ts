/**
 * Conversations list query (F4).
 *
 * Thin composition over the conversation entity: the infinite list plus
 * thread prefetch. No `setQueryData` here — only entity helpers run
 * inside the entity hooks below.
 */

import { useQueryClient } from "@tanstack/react-query";

import { fetchConversation, useConversations } from "@/entities/conversation";
import type { UseConversationOptions } from "@/entities/conversation";
import { queryKeys } from "@/shared/query";

export type ChatListFetchOptions = UseConversationOptions;

export function useChatList(opts: ChatListFetchOptions = {}) {
  const qc = useQueryClient();
  const list = useConversations(opts);

  /** Warm the thread so detail opens without loading. */
  const prefetchThread = (id: string): void => {
    void qc.prefetchQuery({
      queryKey: queryKeys.conversation(id),
      queryFn: async () => {
        const conversation = await fetchConversation(id, opts);
        if (!conversation) throw new Error(`Invalid conversation ${id}`);
        return conversation;
      },
      staleTime: 30_000,
    });
  };

  return { ...list, prefetchThread };
}

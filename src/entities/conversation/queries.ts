/**
 * Conversation queries (F4).
 *
 * - `useConversation` mirrors `usePost` with `queryKeys.conversation(id)`.
 * - `useConversations` is the infinite list; pages hold ids only.
 * - `useMessages` is the per-conversation infinite list (oldest cursor).
 * - `useSendMessage` wraps `sendMessage` with no extra handlers or retry.
 */

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";

import { logger } from "@/shared/observability/logger";
import { queryKeys } from "@/shared/query";

import {
  fetchConversation,
  fetchConversationsPageWire,
  fetchMessagesPageWire,
  sendMessageRemote,
} from "./api";
import { getMessageData, hydrateConversation, sendMessage, setMessage } from "./cache";
import { parseConversation, parseMessage } from "./schema";

export type QueryFetchOptions = {
  fetchImpl?: typeof fetch;
};

export type ConversationsPage = {
  ids: string[];
  nextCursor: string | null;
};

export type MessagesPage = {
  ids: string[];
  nextCursor: string | null;
};

async function toConversationsPage(
  qc: QueryClient,
  cursor: string | null,
  opts: QueryFetchOptions,
): Promise<ConversationsPage> {
  const wire = await fetchConversationsPageWire(cursor, opts);
  if (!wire) {
    logger.warn("[conversation] invalid page", { cursor });
    throw new Error("[conversation] Invalid conversations page");
  }
  const ids: string[] = [];
  for (const item of wire.items) {
    const parsed = parseConversation(item);
    if (!parsed) continue;
    ids.push(hydrateConversation(qc, parsed).conversationId);
  }
  return { ids, nextCursor: wire.nextCursor };
}

async function toMessagesPage(
  qc: QueryClient,
  conversationId: string,
  cursor: string | null,
  opts: QueryFetchOptions,
): Promise<MessagesPage> {
  const wire = await fetchMessagesPageWire(conversationId, cursor, opts);
  if (!wire) {
    logger.warn("[conversation] invalid messages page", { conversationId });
    throw new Error(`[conversation] Invalid messages page for ${conversationId}`);
  }
  const ids: string[] = [];
  for (const item of wire.items) {
    const parsed = parseMessage(item);
    if (!parsed) continue;
    const normalized = { ...parsed, conversationId };
    setMessage(qc, normalized);
    ids.push(normalized.id);
  }
  return { ids, nextCursor: wire.nextCursor };
}

export function useConversation(id: string, opts: QueryFetchOptions = {}) {
  return useQuery({
    queryKey: queryKeys.conversation(id),
    queryFn: async () => {
      const conversation = await fetchConversation(id, opts);
      if (!conversation) throw new Error(`Invalid conversation ${id}`);
      return conversation;
    },
    staleTime: 30_000,
    enabled: id.length > 0,
  });
}

export function useConversations(opts: QueryFetchOptions = {}) {
  const qc = useQueryClient();
  const infinite = useInfiniteQuery({
    queryKey: queryKeys.conversations(),
    queryFn: ({ pageParam }) => toConversationsPage(qc, pageParam, opts),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage: ConversationsPage) => lastPage.nextCursor ?? undefined,
  });

  const conversationIds = (infinite.data?.pages ?? []).flatMap((page) => page.ids);

  /** Warm the canonical conversation so detail opens without loading. */
  const prefetchConversation = (id: string): void => {
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

  return { ...infinite, conversationIds, prefetchConversation };
}

export function useMessages(conversationId: string, opts: QueryFetchOptions = {}) {
  const qc = useQueryClient();
  const infinite = useInfiniteQuery({
    queryKey: queryKeys.conversationMessages(conversationId),
    queryFn: ({ pageParam }) => toMessagesPage(qc, conversationId, pageParam, opts),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage: MessagesPage) => lastPage.nextCursor ?? undefined,
    enabled: conversationId.length > 0,
  });

  const messageIds = (infinite.data?.pages ?? []).flatMap((page) => page.ids);

  return { ...infinite, messageIds };
}

export function useMessage(conversationId: string, messageId: string) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: [...queryKeys.conversationMessages(conversationId), messageId],
    queryFn: async () => {
      const cached = getMessageData(qc, conversationId, messageId);
      if (cached) return cached;
      throw new Error(`Unknown message ${messageId}`);
    },
    staleTime: 30_000,
    enabled: conversationId.length > 0 && messageId.length > 0,
  });
}

export function useSendMessage(conversationId: string, opts: QueryFetchOptions = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: string | { body: string; imageUrl?: string | null }) =>
      sendMessage(qc, conversationId, input, {
        sendRemote: (convId, bodyOrInput) =>
          sendMessageRemote(
            convId,
            typeof bodyOrInput === "string" ? bodyOrInput : bodyOrInput,
            opts,
          ),
      }),
  });
}

export function useHydrateMessage(conversationId: string) {
  const qc = useQueryClient();
  return (messageId: string) => getMessageData(qc, conversationId, messageId);
}

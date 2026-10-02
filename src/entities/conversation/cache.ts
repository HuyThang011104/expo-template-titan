/**
 * Conversation canonical cache (F4).
 *
 * - Only file allowed to `setQueryData(queryKeys.conversation...)` or
 *   `queryKeys.conversationMessages...`. Features call these helpers.
 * - Lists hold ids only; `hydrateConversation` writes the canonical entry.
 * - `sendMessage` is read -> optimistic append -> server wins -> rollback.
 * - `upsertIncomingMessage` handles the socket stub (`message.added`).
 */

import type { InfiniteData, QueryClient } from "@tanstack/react-query";

import { logger } from "@/shared/observability/logger";
import { queryKeys } from "@/shared/query";

import { sendMessageRemote } from "./api";
import type { Conversation, Message } from "./model";

export type ConversationsPageShape = {
  ids: string[];
  nextCursor: string | null;
};

export type MessagesPageShape = {
  ids: string[];
  nextCursor: string | null;
};

/** Overwrite the canonical conversation. */
export function setConversation(qc: QueryClient, conversation: Conversation): void {
  qc.setQueryData(queryKeys.conversation(conversation.id), conversation);
}

/** Read the canonical conversation (no fetch). */
export function getConversationData(qc: QueryClient, id: string): Conversation | undefined {
  return qc.getQueryData<Conversation>(queryKeys.conversation(id));
}

/** Overwrite the canonical message. */
export function setMessage(qc: QueryClient, message: Message): void {
  qc.setQueryData(messageKey(message.conversationId, message.id), message);
}

function messageKey(conversationId: string, messageId: string): readonly string[] {
  return [...queryKeys.conversationMessages(conversationId), messageId] as const;
}

/** Read the canonical message (no fetch). */
export function getMessageData(
  qc: QueryClient,
  conversationId: string,
  messageId: string,
): Message | undefined {
  return qc.getQueryData<Message>(messageKey(conversationId, messageId));
}

/**
 * Hydrate one wire conversation; returns `{ conversationId }`.
 */
export function hydrateConversation(
  qc: QueryClient,
  conversation: Conversation,
): { conversationId: string } {
  setConversation(qc, conversation);
  return { conversationId: conversation.id };
}

/**
 * Hydrate one wire message: canonical entry + append to the first
 * messages page when the list is already loaded. Returns `{ messageId }`.
 */
export function hydrateMessage(
  qc: QueryClient,
  message: Message,
): { messageId: string } {
  setMessage(qc, message);
  qc.setQueryData<InfiniteData<MessagesPageShape, string | null>>(
    queryKeys.conversationMessages(message.conversationId),
    (old) => {
      if (!old) return old;
      const [first, ...rest] = old.pages;
      if (!first) return old;
      if (first.ids.includes(message.id)) return old;
      return {
        ...old,
        pages: [{ ...first, ids: [...first.ids, message.id] }, ...rest],
      };
    },
  );
  return { messageId: message.id };
}

/**
 * Socket stub entrypoint: an incoming `message.added` payload hydrates the
 * canonical message and bumps the conversation preview. Invalid payloads
 * only warn (never crash the subscriber).
 */
export function upsertIncomingMessage(qc: QueryClient, message: Message): void {
  hydrateMessage(qc, message);
  const prev = getConversationData(qc, message.conversationId);
  if (prev) {
    setConversation(qc, {
      ...prev,
      lastMessagePreview: message.body.slice(0, 120),
      lastMessageAt: message.createdAt,
      unreadCount: prev.unreadCount + 1,
    });
  }
}

/** Mark a conversation read (preview stays, unread resets). */
export function markConversationRead(qc: QueryClient, id: string): void {
  const prev = getConversationData(qc, id);
  if (!prev || prev.unreadCount === 0) return;
  setConversation(qc, { ...prev, unreadCount: 0 });
}

export type SendMessageRemoteFn = typeof sendMessageRemote;

export type SendMessageOptions = {
  sendRemote?: SendMessageRemoteFn;
};

/**
 * Send a message with optimistic append; all callers must use this.
 * Temp id `temp-<ts>` rolls back (removed) when the server fails.
 */
export async function sendMessage(
  qc: QueryClient,
  conversationId: string,
  body: string,
  opts: SendMessageOptions = {},
): Promise<void> {
  const trimmed = body.trim();
  if (!trimmed) return;
  const temp: Message = {
    id: `temp-${Date.now().toString(36)}`,
    conversationId,
    senderId: "me",
    body: trimmed,
    createdAt: new Date().toISOString(),
  };
  setMessage(qc, temp);
  qc.setQueryData<InfiniteData<MessagesPageShape, string | null>>(
    queryKeys.conversationMessages(conversationId),
    (old) => {
      if (!old) {
        return { pages: [{ ids: [temp.id], nextCursor: null }], pageParams: [null] };
      }
      const [first, ...rest] = old.pages;
      if (!first) return old;
      return {
        ...old,
        pages: [{ ...first, ids: [...first.ids, temp.id] }, ...rest],
      };
    },
  );

  const remote = opts.sendRemote ?? sendMessageRemote;
  try {
    const server = await remote(conversationId, trimmed);
    if (server) {
      qc.setQueryData<InfiniteData<MessagesPageShape, string | null>>(
        queryKeys.conversationMessages(conversationId),
        (old) => {
          if (!old) {
            return { pages: [{ ids: [server.id], nextCursor: null }], pageParams: [null] };
          }
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              ids: page.ids.map((id) => (id === temp.id ? server.id : id)),
            })),
          };
        },
      );
      qc.removeQueries({ queryKey: messageKey(conversationId, temp.id) });
      hydrateMessage(qc, { ...server, conversationId });
      const prev = getConversationData(qc, conversationId);
      if (prev) {
        setConversation(qc, {
          ...prev,
          lastMessagePreview: server.body.slice(0, 120),
          lastMessageAt: server.createdAt,
        });
      }
      return;
    }
  } catch {
    // Fall through to rollback below.
  }
  qc.setQueryData<InfiniteData<MessagesPageShape, string | null>>(
    queryKeys.conversationMessages(conversationId),
    (old) => {
      if (!old) return old;
      return {
        ...old,
        pages: old.pages.map((page) => ({
          ...page,
          ids: page.ids.filter((id) => id !== temp.id),
        })),
      };
    },
  );
  qc.removeQueries({ queryKey: messageKey(conversationId, temp.id) });
  logger.warn("[conversation] send failed, rolled back", { conversationId });
}

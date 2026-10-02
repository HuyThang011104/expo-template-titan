/**
 * Chat thread query (F4).
 *
 * Thread = conversation header + infinite messages + send mutation.
 * Send goes through the entity `sendMessage` (optimistic + rollback).
 */

import { useQueryClient } from "@tanstack/react-query";

import {
  useConversation,
  useMessages,
  useSendMessage,
} from "@/entities/conversation";
import type { UseConversationOptions } from "@/entities/conversation";

export type ChatThreadFetchOptions = UseConversationOptions;

export function useChatThread(conversationId: string, opts: ChatThreadFetchOptions = {}) {
  const qc = useQueryClient();
  const conversation = useConversation(conversationId, opts);
  const messages = useMessages(conversationId, opts);
  const send = useSendMessage(conversationId, opts);

  return {
    conversation,
    messages,
    messageIds: messages.messageIds,
    send: (body: string) => send.mutate(body),
    sendResult: send.data,
    isSending: send.isPending,
    sendError: send.error,
    queryClient: qc,
  };
}

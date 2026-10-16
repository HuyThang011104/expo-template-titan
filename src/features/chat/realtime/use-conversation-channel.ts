/**
 * Socket stub subscription for one thread (F4 + G3.2).
 *
 * - Subscribes to `channelForConversation(id)` via the shared socket.
 * - `message.added` payloads go through `parseMessage` + `upsertIncomingMessage`.
 * - G3.2 `message.seen` flips loaded messages to `seen` (sender sees Đã xem).
 * - G3.2 `typing.started` / `typing.stopped` patch presence with a TTL
 *   (indicator dies a few seconds after the peer stops).
 * - Invalid payloads only warn, never crash the subscriber.
 * - Connection lifecycle stays in `RealtimeProvider`; this only subscribes.
 */

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

import {
  markMessagesSeen,
  parseMessage,
  parseMessageSeenPayload,
  parseTypingPayload,
  upsertIncomingMessage,
  upsertTypingStarted,
  upsertTypingStopped,
} from "@/entities/conversation";
import { channelForConversation } from "@/shared/realtime/channels";
import { useChannel } from "@/shared/realtime/use-channel";

export function useConversationChannel(conversationId: string | null): void {
  const qc = useQueryClient();

  const handleEvent = useCallback(
    (event: { type: string; payload: unknown }) => {
      if (!conversationId) return;
      if (event.type === "message.added") {
        const parsed = parseMessage(event.payload);
        if (!parsed) return;
        upsertIncomingMessage(qc, { ...parsed, conversationId });
        return;
      }
      if (event.type === "message.seen") {
        const parsed = parseMessageSeenPayload(event.payload);
        if (!parsed || parsed.conversationId !== conversationId) return;
        markMessagesSeen(qc, conversationId);
        return;
      }
      if (event.type === "typing.started") {
        const parsed = parseTypingPayload(event.payload);
        if (!parsed || parsed.conversationId !== conversationId) return;
        if (parsed.userId === "me") return;
        upsertTypingStarted(qc, conversationId, parsed.userId);
        return;
      }
      if (event.type === "typing.stopped") {
        const parsed = parseTypingPayload(event.payload);
        if (!parsed || parsed.conversationId !== conversationId) return;
        if (parsed.userId === "me") return;
        upsertTypingStopped(qc, conversationId, parsed.userId);
      }
    },
    [qc, conversationId],
  );

  useChannel(conversationId ? channelForConversation(conversationId) : null, handleEvent);
}

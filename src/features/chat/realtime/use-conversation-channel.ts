/**
 * Socket stub subscription for one thread (F4).
 *
 * - Subscribes to `channelForConversation(id)` via the shared socket.
 * - `message.added` payloads go through `parseMessage` + `upsertIncomingMessage`
 *   (invalid payloads only warn, never crash the subscriber).
 * - Connection lifecycle stays in `RealtimeProvider`; this only subscribes.
 */

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { parseMessage, upsertIncomingMessage } from "@/entities/conversation";
import { channelForConversation } from "@/shared/realtime/channels";
import { useChannel } from "@/shared/realtime/use-channel";

export function useConversationChannel(conversationId: string | null): void {
  const qc = useQueryClient();

  const handleEvent = useCallback(
    (event: { type: string; payload: unknown }) => {
      if (event.type !== "message.added") return;
      if (!conversationId) return;
      const parsed = parseMessage(event.payload);
      if (!parsed) return;
      upsertIncomingMessage(qc, { ...parsed, conversationId });
    },
    [qc, conversationId],
  );

  useChannel(conversationId ? channelForConversation(conversationId) : null, handleEvent);
}

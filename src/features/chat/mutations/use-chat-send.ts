/**
 * Chat send mutation with offline queue (G3.3).
 *
 * - Blocked peers throw a clear Vietnamese error (never silent loss);
 *   the detail screen already locks the composer, this is the backstop.
 * - Offline tap (`onlineManager.isOnline() === false`) parks the message as
 *   `queued` + enqueues one `chat.send` outbox job — badge shows `Queued`,
 *   no flicker through `sending`.
 * - Online tap sends via the entity `sendMessage` (optimistic + rollback);
 *   a mid-flight drop that lands us offline queues instead of losing the
 *   text, a drop while still online throws loudly for a manual retry.
 * - Image path: `{ body, imageUrl }` when already uploaded, or
 *   `{ body, localImageUri }` when the upload never finished — the outbox
 *   sender re-uploads at drain.
 */

import { useState } from "react";
import { onlineManager, useQueryClient } from "@tanstack/react-query";

import {
  canMessageTarget,
  type User,
} from "@/entities/user";
import {
  getConversationData,
  queueMessage,
  sendMessage,
  sendMessageRemote,
} from "@/entities/conversation";
import { isApiError } from "@/shared/api/errors";
// Deep import: `@/shared/media` pulls expo-audio (native-only, crashes Jest).
import { uploadMedia } from "@/shared/media/upload";
import { enqueueOutboxJob } from "@/shared/storage/db/outbox";
import { queryKeys } from "@/shared/query";

import { buildChatSendPayload, CHAT_OUTBOX_KIND, pickedMediaFromUri } from "../outbox-sender";

export type ChatSendInput = {
  body: string;
  imageUrl?: string | null;
  localImageUri?: string | null;
};

export type ChatSendResult = { status: "sent" } | { status: "queued"; messageId: string };

export type ChatSendFetchOptions = {
  fetchImpl?: typeof fetch;
};

export function useChatSend(conversationId: string, opts: ChatSendFetchOptions = {}) {
  const qc = useQueryClient();
  const [isSending, setIsSending] = useState(false);

  async function enqueue(input: ChatSendInput): Promise<ChatSendResult> {
    const { messageId, clientId } = queueMessage(
      qc,
      conversationId,
      { body: input.body, imageUrl: input.imageUrl, localImageUri: input.localImageUri },
    );
    await enqueueOutboxJob(
      CHAT_OUTBOX_KIND,
      buildChatSendPayload({
        conversationId,
        body: input.body.trim(),
        imageUrl: input.imageUrl ?? null,
        localImageUri: input.localImageUri ?? null,
        clientId,
      }),
    );
    return { status: "queued", messageId };
  }

  async function send(input: ChatSendInput): Promise<ChatSendResult> {
    const trimmed = input.body.trim();
    if (!trimmed && !input.imageUrl && !input.localImageUri) {
      throw new Error("Tin nhắn trống.");
    }
    const peerId = getConversationData(qc, conversationId)?.participantIds[0];
    const meId = qc.getQueryData<User>(queryKeys.me)?.id ?? "";
    if (peerId && meId && !canMessageTarget(qc, peerId, meId)) {
      throw new Error("Bạn không thể nhắn tin cho người này.");
    }
    setIsSending(true);
    try {
      if (!onlineManager.isOnline()) {
        return await enqueue(input);
      }
      // Local image never uploaded (queued draft from an offline tap):
      // upload now, or fall back to the outbox when the network drops.
      let imageUrl = input.imageUrl ?? null;
      if (!imageUrl && input.localImageUri) {
        try {
          const uploaded = await uploadMedia(pickedMediaFromUri(input.localImageUri), {
            fetchImpl: opts.fetchImpl,
          });
          imageUrl = uploaded.url;
        } catch (error) {
          if (isApiError(error) && (error.code === "NETWORK" || error.code === "TIMEOUT")) {
            return await enqueue(input);
          }
          throw error;
        }
      }
      const ok = await sendMessage(
        qc,
        conversationId,
        { body: trimmed, imageUrl },
        {
          sendRemote: (convId, bodyOrInput) =>
            sendMessageRemote(
              convId,
              typeof bodyOrInput === "string" ? bodyOrInput : bodyOrInput,
              opts,
            ),
        },
      );
      if (ok) return { status: "sent" };
      // Rolled back mid-flight: offline now means queue (keep the text),
      // still online means a real failure — loud retry, no silent loss.
      if (!onlineManager.isOnline()) {
        return await enqueue(input);
      }
      throw new Error("Không gửi được tin nhắn. Thử lại.");
    } finally {
      setIsSending(false);
    }
  }

  return { send, isSending };
}

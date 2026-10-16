/**
 * Conversation + Message zod schemas (F4).
 *
 * Parse failure -> `logger.warn` + `null`, no throw.
 */

import { z } from "zod";

import { logger } from "@/shared/observability/logger";

import type { Conversation, Message, Presence } from "./model";

export const conversationSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  participantIds: z.array(z.string().min(1)).min(1),
  lastMessagePreview: z.string(),
  lastMessageAt: z.string().datetime({ offset: true }),
  unreadCount: z.number().int().nonnegative(),
});

export const messageSchema = z.object({
  id: z.string().min(1),
  conversationId: z.string().min(1),
  senderId: z.string().min(1),
  // G3.1: image-only messages may carry an empty body.
  body: z.string().max(2000),
  // Old wire payloads lack these — default keeps them parseable.
  imageUrl: z.string().min(1).nullable().optional().transform((v) => v ?? null),
  status: z.enum(["sending", "sent", "seen", "queued"]).optional().transform((v) => v ?? "sent"),
  createdAt: z.string().datetime({ offset: true }),
});

function extractId(data: unknown): string | undefined {
  if (data !== null && typeof data === "object" && "id" in data) {
    const id = (data as { id: unknown }).id;
    return typeof id === "string" ? id : undefined;
  }
  return undefined;
}

/** Parse `unknown` -> `Conversation | null`. */
export function parseConversation(data: unknown): Conversation | null {
  const result = conversationSchema.safeParse(data);
  if (result.success) return result.data;
  logger.warn("[entity] schema parse failed", {
    entity: "conversation",
    id: extractId(data),
  });
  return null;
}

/** Parse `unknown` -> `Message | null`. */
export function parseMessage(data: unknown): Message | null {
  const result = messageSchema.safeParse(data);
  if (result.success) return result.data;
  logger.warn("[entity] schema parse failed", {
    entity: "message",
    id: extractId(data),
  });
  return null;
}

export const presenceSchema = z.object({
  userId: z.string().min(1),
  online: z.boolean(),
  lastSeenAt: z.string().datetime({ offset: true }).nullable(),
  // G3.2: `typingInConvId` is the mock wire alias for `typingInConversationId`.
  typingInConversationId: z.string().min(1).nullable().optional().transform((v) => v ?? null),
  typingExpiresAt: z.string().datetime({ offset: true }).nullable().optional().transform((v) => v ?? null),
});

const typingPayloadSchema = z.object({
  conversationId: z.string().min(1),
  userId: z.string().min(1),
});

const messageSeenPayloadSchema = z.object({
  conversationId: z.string().min(1),
  messageIds: z.array(z.string().min(1)).optional(),
});

/** Parse `unknown` -> `Presence | null`. Accepts the mock `typingInConvId` alias. */
export function parsePresence(data: unknown): Presence | null {
  const normalized =
    data !== null && typeof data === "object" && "typingInConvId" in data && !("typingInConversationId" in data)
      ? { ...(data as Record<string, unknown>), typingInConversationId: (data as Record<string, unknown>)["typingInConvId"] }
      : data;
  const result = presenceSchema.safeParse(normalized);
  if (result.success) {
    // G3.2: a typing entry without expiry never clears — default it to now + TTL.
    // Keep server expiries as-is.
    if (result.data.typingInConversationId && !result.data.typingExpiresAt) {
      return {
        ...result.data,
        typingExpiresAt: new Date(Date.now() + 5_000).toISOString(),
      };
    }
    return result.data;
  }
  logger.warn("[entity] schema parse failed", {
    entity: "presence",
    id: extractId(data),
  });
  return null;
}

/** Parse a `typing.started` / `typing.stopped` payload -> `{ conversationId, userId } | null`. */
export function parseTypingPayload(data: unknown): { conversationId: string; userId: string } | null {
  const result = typingPayloadSchema.safeParse(data);
  if (result.success) return result.data;
  logger.warn("[entity] schema parse failed", { entity: "typing-payload" });
  return null;
}

/** Parse a `message.seen` payload -> `{ conversationId, messageIds? } | null`. */
export function parseMessageSeenPayload(
  data: unknown,
): { conversationId: string; messageIds?: string[] } | null {
  const result = messageSeenPayloadSchema.safeParse(data);
  if (result.success) return result.data;
  logger.warn("[entity] schema parse failed", { entity: "message-seen-payload" });
  return null;
}

export const sendMessageInputSchema = z
  .object({
    body: z.string().trim().max(2000),
    imageUrl: z.string().min(1).nullable().optional().transform((v) => v ?? null),
  })
  .refine((v) => v.body.length > 0 || v.imageUrl !== null, {
    message: "Empty message",
  });

export type SendMessageInput = z.infer<typeof sendMessageInputSchema>;

/** Parse composer input -> trimmed `SendMessageInput | null` (no throw). */
export function parseSendMessageInput(data: unknown): SendMessageInput | null {
  const result = sendMessageInputSchema.safeParse(data);
  if (result.success) return result.data;
  logger.warn("[entity] schema parse failed", { entity: "message-send-input" });
  return null;
}

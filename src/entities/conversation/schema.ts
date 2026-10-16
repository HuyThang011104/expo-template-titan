/**
 * Conversation + Message zod schemas (F4).
 *
 * Parse failure -> `logger.warn` + `null`, no throw.
 */

import { z } from "zod";

import { logger } from "@/shared/observability/logger";

import type { Conversation, Message } from "./model";

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
  status: z.enum(["sending", "sent", "seen"]).optional().transform((v) => v ?? "sent"),
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

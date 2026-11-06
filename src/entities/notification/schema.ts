/**
 * Notification zod schema (F5).
 *
 * Parse failure → `logger.warn` + `null`, no throw.
 */

import { z } from "zod";

import { logger } from "@/shared/observability/logger";

import type { Notification } from "./model";

export const notificationSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(["like", "follow", "post", "mention"]),
  actorId: z.string().min(1),
  postId: z.string().min(1).nullable(),
  read: z.boolean(),
  createdAt: z.string().datetime({ offset: true }),
});

function extractId(data: unknown): string | undefined {
  if (data !== null && typeof data === "object" && "id" in data) {
    const id = (data as { id: unknown }).id;
    return typeof id === "string" ? id : undefined;
  }
  return undefined;
}

/** Parse `unknown` → `Notification | null`. */
export function parseNotification(data: unknown): Notification | null {
  const result = notificationSchema.safeParse(data);
  if (result.success) return result.data;
  logger.warn("[entity] schema parse failed", {
    entity: "notification",
    id: extractId(data),
  });
  return null;
}

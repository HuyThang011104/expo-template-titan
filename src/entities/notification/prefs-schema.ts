/**
 * Notification preferences zod schema (G2.3).
 *
 * Only place allowed to `import zod` for prefs.
 * `safeParse` failure → `logger.warn` + `null`, no throw.
 */

import { z } from "zod";

import { logger } from "@/shared/observability/logger";

import type { NotifPrefs } from "./prefs";

export const notifPrefsSchema = z.object({
  like: z.boolean(),
  follow: z.boolean(),
  comment: z.boolean(),
  mention: z.boolean(),
  message: z.boolean(),
});

/** Parse `unknown` → `NotifPrefs | null`. */
export function parseNotifPrefs(data: unknown): NotifPrefs | null {
  const result = notifPrefsSchema.safeParse(data);
  if (result.success) return result.data;
  logger.warn("[entity] schema parse failed", { entity: "notif-prefs" });
  return null;
}

export const updateNotifPrefsInputSchema = z
  .object({
    like: z.boolean().optional(),
    follow: z.boolean().optional(),
    comment: z.boolean().optional(),
    mention: z.boolean().optional(),
    message: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: "Empty prefs patch" });

export type UpdateNotifPrefsInput = z.infer<typeof updateNotifPrefsInputSchema>;

/** Parse a partial prefs patch (at least one key) → input or `null`. */
export function parseUpdateNotifPrefsInput(data: unknown): UpdateNotifPrefsInput | null {
  const result = updateNotifPrefsInputSchema.safeParse(data);
  if (!result.success) {
    logger.warn("[entity] schema parse failed", { entity: "notif-prefs-input" });
    return null;
  }
  return result.data;
}

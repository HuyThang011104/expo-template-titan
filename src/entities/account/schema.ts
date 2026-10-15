/**
 * Account zod schema (G2.4).
 *
 * Only place allowed to `import zod` at the entity layer.
 * `safeParse` failure → `logger.warn` + `null`, no throw.
 */

import { z } from "zod";

import { logger } from "@/shared/observability/logger";

import type { AccountSession, ExportData } from "./model";

export const sessionSchema = z.object({
  id: z.string().min(1),
  deviceName: z.string().min(1),
  ipAddress: z.string().min(1),
  current: z.boolean(),
  lastActiveAt: z.string().datetime({ offset: true }),
});

/** Parse `unknown` → `AccountSession | null`. */
export function parseSession(data: unknown): AccountSession | null {
  const result = sessionSchema.safeParse(data);
  if (result.success) return result.data;
  logger.warn("[entity] schema parse failed", { entity: "account-session" });
  return null;
}

/** Parse a sessions array → valid sessions only (never throws). */
export function parseSessionList(data: unknown): AccountSession[] {
  if (!Array.isArray(data)) {
    logger.warn("[entity] schema parse failed", { entity: "account-sessions" });
    return [];
  }
  const out: AccountSession[] = [];
  for (const entry of data) {
    const parsed = parseSession(entry);
    if (parsed) out.push(parsed);
  }
  return out;
}

export const changePasswordInputSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6).max(72),
});

export type ChangePasswordInput = z.infer<typeof changePasswordInputSchema>;

/**
 * Parse password change input → trimmed input or `null` (no throw).
 * Confirmation matching stays in the feature (needs both fields + UX text).
 */
export function parseChangePasswordInput(data: unknown): ChangePasswordInput | null {
  const result = changePasswordInputSchema.safeParse(data);
  if (!result.success) {
    logger.warn("[entity] schema parse failed", { entity: "account-password-input" });
    return null;
  }
  if (result.data.currentPassword === result.data.newPassword) {
    logger.warn("[entity] schema parse failed", { entity: "account-password-input" });
    return null;
  }
  return result.data;
}

const exportDataSchema = z.object({
  profile: z.object({
    id: z.string().min(1),
    handle: z.string().min(1),
    displayName: z.string().min(1),
    bio: z.string().nullable(),
    avatarUrl: z.string().nullable(),
    coverUrl: z.string().nullable(),
    link: z.string().nullable(),
  }),
  posts: z.array(
    z.object({
      id: z.string().min(1),
      body: z.string(),
      likeCount: z.number().int().nonnegative(),
      createdAt: z.string().datetime({ offset: true }),
    }),
  ),
  exportedAt: z.string().datetime({ offset: true }),
});

/** Parse `unknown` → `ExportData | null`. */
export function parseExportData(data: unknown): ExportData | null {
  const result = exportDataSchema.safeParse(data);
  if (result.success) return result.data;
  logger.warn("[entity] schema parse failed", { entity: "account-export" });
  return null;
}

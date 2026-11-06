/**
 * User zod schema.
 *
 * Only place allowed to `import zod` at the entity layer.
 * `safeParse` failure → `logger.warn` + `null`, no throw.
 */

import { z } from "zod";

import { logger } from "@/shared/observability/logger";

import { DEFAULT_PRIVACY_SETTINGS, type PrivacySettings, type User } from "./model";

export const privacySettingsSchema = z.object({
  messageAudience: z.enum(["everyone", "following", "none"]),
  postVisibility: z.enum(["public", "followers"]),
  tagAudience: z.enum(["everyone", "following", "none"]),
});

export const userSchema = z.object({
  id: z.string().min(1),
  handle: z.string().min(1),
  displayName: z.string().min(1),
  avatarUrl: z.string().url().nullable(),
  // G2.1: optional for backward compat with old fixtures/snapshots.
  // Missing → null via `parseUser` normalization below.
  bio: z.string().max(160).nullable().optional(),
  coverUrl: z.string().url().nullable().optional(),
  link: z.string().url().nullable().optional(),
  // G2.3: optional for backward compat; missing → defaults.
  privacySettings: privacySettingsSchema.nullable().optional(),
});

export type UserDTO = z.infer<typeof userSchema>;

function extractId(data: unknown): string | undefined {
  if (data !== null && typeof data === "object" && "id" in data) {
    const id = (data as { id: unknown }).id;
    return typeof id === "string" ? id : undefined;
  }
  return undefined;
}

/** Parse `unknown` (from `client.get<unknown>`) into `User | null`. */
export function parseUser(data: unknown): User | null {
  const result = userSchema.safeParse(data);
  if (result.success) {
    return {
      ...result.data,
      bio: result.data.bio ?? null,
      coverUrl: result.data.coverUrl ?? null,
      link: result.data.link ?? null,
      privacySettings: result.data.privacySettings ?? { ...DEFAULT_PRIVACY_SETTINGS },
    };
  }
  logger.warn("[entity] schema parse failed", {
    entity: "user",
    id: extractId(data),
  });
  return null;
}

/** Parse `unknown` into `PrivacySettings | null` (no throw). */
export function parsePrivacySettings(data: unknown): PrivacySettings | null {
  const result = privacySettingsSchema.safeParse(data);
  if (result.success) return result.data;
  logger.warn("[entity] schema parse failed", { entity: "user-privacy" });
  return null;
}

export const updatePrivacyInputSchema = z.object({
  messageAudience: z.enum(["everyone", "following", "none"]).optional(),
  postVisibility: z.enum(["public", "followers"]).optional(),
  tagAudience: z.enum(["everyone", "following", "none"]).optional(),
});

export type UpdatePrivacyInput = z.infer<typeof updatePrivacyInputSchema>;

/** Parse privacy edit input (partial; at least one key) → `UpdatePrivacyInput | null`. */
export function parseUpdatePrivacyInput(data: unknown): UpdatePrivacyInput | null {
  const result = updatePrivacyInputSchema.safeParse(data);
  if (!result.success || Object.keys(result.data).length === 0) {
    logger.warn("[entity] schema parse failed", { entity: "user-privacy-input" });
    return null;
  }
  return result.data;
}

export const updateProfileInputSchema = z.object({
  displayName: z.string().trim().min(1).max(50),
  bio: z.string().trim().max(160),
  avatarUrl: z.string().url().nullable(),
  coverUrl: z.string().url().nullable(),
  link: z.string().trim().max(2048),
});

export type UpdateProfileInput = z.infer<typeof updateProfileInputSchema>;

/**
 * Parse edit-profile input → trimmed `UpdateProfileInput | null` (no throw).
 * Empty bio/link normalize to "" (callers send null for empty link);
 * avatar/cover stay nullable URLs. Link must be a valid http(s) URL when non-empty.
 */
export function parseUpdateProfileInput(data: unknown): UpdateProfileInput | null {
  const result = updateProfileInputSchema.safeParse(data);
  if (!result.success) {
    logger.warn("[entity] schema parse failed", { entity: "user-update-input" });
    return null;
  }
  const link = result.data.link.trim();
  if (link.length > 0) {
    try {
      const url = new URL(link);
      if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    } catch {
      logger.warn("[entity] schema parse failed", { entity: "user-update-input" });
      return null;
    }
  }
  return { ...result.data, link };
}

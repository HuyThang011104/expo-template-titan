/**
 * Relationship zod schema (F6).
 *
 * Only place allowed to `import zod` for relationships.
 * `safeParse` failure → `logger.warn` + `null`, no throw.
 */

import { z } from "zod";

import { logger } from "@/shared/observability/logger";

import type { Relationship } from "./relationship";

export const relationshipSchema = z.object({
  userId: z.string().min(1),
  blockedByMe: z.boolean(),
  mutedByMe: z.boolean(),
  followStatus: z.enum(["none", "following", "requested"]),
  followersCount: z.number().int().min(0),
  followingCount: z.number().int().min(0),
  isPrivate: z.boolean(),
  blockedByTarget: z.boolean(),
  updatedAt: z.string().datetime({ offset: true }),
});

/** Parse `unknown` into `Relationship | null`. */
export function parseRelationship(data: unknown): Relationship | null {
  const result = relationshipSchema.safeParse(data);
  if (result.success) return result.data;
  logger.warn("[entity] schema parse failed", { entity: "relationship" });
  return null;
}

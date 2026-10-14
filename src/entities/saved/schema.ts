/**
 * Saved list zod schema (G1.4).
 *
 * Only place allowed to `import zod` at the entity layer.
 * `safeParse` failure → `logger.warn` + `null`, no throw.
 */

import { z } from "zod";

import { logger } from "@/shared/observability/logger";

import type { SavedPostWireItem } from "./model";

const savedPostSchema = z.object({
  id: z.string().min(1),
  authorId: z.string().min(1),
  body: z.string(),
  media: z.array(z.object({ kind: z.enum(["image", "video"]), url: z.string().url() })),
  likeCount: z.number().int().nonnegative(),
  likedByMe: z.boolean(),
  createdAt: z.string().datetime({ offset: true }),
});

const savedPostWireItemSchema = z.object({
  post: savedPostSchema,
  // Duplicates the User shape on purpose; kept local to respect the boundary.
  author: z.object({
    id: z.string().min(1),
    handle: z.string().min(1),
    displayName: z.string().min(1),
    avatarUrl: z.string().url().nullable(),
  }),
});

/** Parse `unknown` into `SavedPostWireItem | null`. */
export function parseSavedPostWireItem(data: unknown): SavedPostWireItem | null {
  const result = savedPostWireItemSchema.safeParse(data);
  if (result.success) return result.data;
  logger.warn("[entity] schema parse failed", { entity: "saved-item" });
  return null;
}

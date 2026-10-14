/**
 * Comment zod schema (G1.2).
 *
 * Only place allowed to `import zod` at the entity layer.
 * `safeParse` failure → `logger.warn` + `null`, no throw.
 */

import { z } from "zod";

import { logger } from "@/shared/observability/logger";

import type { Comment, CommentWireItem } from "./model";

export const COMMENT_MAX_LENGTH = 500;

export const commentSchema = z.object({
  id: z.string().min(1),
  postId: z.string().min(1),
  authorId: z.string().min(1),
  body: z.string().min(1).max(COMMENT_MAX_LENGTH),
  parentId: z.string().min(1).nullable(),
  likeCount: z.number().int().nonnegative(),
  likedByMe: z.boolean(),
  createdAt: z.string().datetime({ offset: true }),
});

export type CommentDTO = z.infer<typeof commentSchema>;

function extractId(data: unknown): string | undefined {
  if (data !== null && typeof data === "object" && "id" in data) {
    const id = (data as { id: unknown }).id;
    return typeof id === "string" ? id : undefined;
  }
  return undefined;
}

/** Parse `unknown` into `Comment | null`. */
export function parseComment(data: unknown): Comment | null {
  const result = commentSchema.safeParse(data);
  if (result.success) return result.data;
  logger.warn("[entity] schema parse failed", {
    entity: "comment",
    id: extractId(data),
  });
  return null;
}

const commentWireItemSchema = z.object({
  comment: commentSchema,
  // Duplicates the User shape on purpose; kept local to respect the boundary.
  author: z.object({
    id: z.string().min(1),
    handle: z.string().min(1),
    displayName: z.string().min(1),
    avatarUrl: z.string().url().nullable(),
  }),
});

/** Parse `unknown` into `CommentWireItem | null` (bad items are skipped by callers). */
export function parseCommentWireItem(data: unknown): CommentWireItem | null {
  const result = commentWireItemSchema.safeParse(data);
  if (result.success) return result.data;
  logger.warn("[entity] schema parse failed", { entity: "comment-item" });
  return null;
}

export const createCommentInputSchema = z.object({
  body: z.string().trim().min(1).max(COMMENT_MAX_LENGTH),
  parentId: z.string().min(1).nullable(),
});

export type CreateCommentInput = z.infer<typeof createCommentInputSchema>;

/** Parse composer input into `CreateCommentInput | null`. */
export function parseCreateCommentInput(data: unknown): CreateCommentInput | null {
  const result = createCommentInputSchema.safeParse(data);
  if (result.success) return result.data;
  logger.warn("[entity] schema parse failed", { entity: "comment-create-input" });
  return null;
}

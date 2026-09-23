/**
 * Post zod schema.
 *
 * Parse failure → `logger.warn` + `null`, no throw.
 */

import { z } from "zod";

import { logger } from "@/shared/observability/logger";

import type { FeedWireItem, Post } from "./model";

const mediaSchema = z.object({
  kind: z.enum(["image", "video"]),
  url: z.string().url(),
});

export const postSchema = z.object({
  id: z.string().min(1),
  authorId: z.string().min(1),
  body: z.string(),
  media: z.array(mediaSchema),
  likeCount: z.number().int().nonnegative(),
  likedByMe: z.boolean(),
  createdAt: z.string().datetime({ offset: true }),
});

export type PostDTO = z.infer<typeof postSchema>;

function extractId(data: unknown): string | undefined {
  if (data !== null && typeof data === "object" && "id" in data) {
    const id = (data as { id: unknown }).id;
    return typeof id === "string" ? id : undefined;
  }
  return undefined;
}

/** Parse `unknown` → `Post | null`. */
export function parsePost(data: unknown): Post | null {
  const result = postSchema.safeParse(data);
  if (result.success) return result.data;
  logger.warn("[entity] schema parse failed", {
    entity: "post",
    id: extractId(data),
  });
  return null;
}

const feedWireItemSchema = z.object({
  post: postSchema,
  // Duplicates the User shape on purpose; kept local to respect the boundary.
  author: z.object({
    id: z.string().min(1),
    handle: z.string().min(1),
    displayName: z.string().min(1),
    avatarUrl: z.string().url().nullable(),
  }),
});

/**
 * Parse wire `{ post, author }` → `FeedWireItem | null`.
 */
export function parseFeedWireItem(data: unknown): FeedWireItem | null {
  const shaped = feedWireItemSchema.safeParse(data);
  if (!shaped.success) {
    logger.warn("[entity] schema parse failed", { entity: "feed-item" });
    return null;
  }
  return shaped.data;
}

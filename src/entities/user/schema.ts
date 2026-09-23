/**
 * User zod schema.
 *
 * Only place allowed to `import zod` at the entity layer.
 * `safeParse` failure → `logger.warn` + `null`, no throw.
 */

import { z } from "zod";

import { logger } from "@/shared/observability/logger";

import type { User } from "./model";

export const userSchema = z.object({
  id: z.string().min(1),
  handle: z.string().min(1),
  displayName: z.string().min(1),
  avatarUrl: z.string().url().nullable(),
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
  if (result.success) return result.data;
  logger.warn("[entity] schema parse failed", {
    entity: "user",
    id: extractId(data),
  });
  return null;
}

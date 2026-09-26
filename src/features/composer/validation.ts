/**
 * Composer input validation (F1.1 text-only).
 *
 * Wraps `parseCreatePostInput` from `entities/post` so the screen only deals
 * with display strings. Zod failure → `null` + `logger.warn` inside the entity;
 * here we map to a Vietnamese inline message (no throw).
 */

import { parseCreatePostInput, type CreatePostInput } from "@/entities/post";

export const COMPOSER_MAX_LENGTH = 280;
export const COMPOSER_MAX_MEDIA = 4;

export type ComposerValidation =
  | { ok: true; value: CreatePostInput }
  | { ok: false; error: string };

/**
 * Validate text-only composer body (`mediaIds: []`).
 * Returns the trimmed `CreatePostInput` or an inline message.
 */
export function validateComposerBody(body: string): ComposerValidation {
  const parsed = parseCreatePostInput({ body, mediaIds: [] });
  if (parsed) return { ok: true, value: parsed };
  const trimmed = body.trim();
  if (trimmed.length === 0) return { ok: false, error: "Hãy nhập nội dung bài viết." };
  if (trimmed.length > COMPOSER_MAX_LENGTH) {
    return { ok: false, error: `Bài viết tối đa ${COMPOSER_MAX_LENGTH} ký tự.` };
  }
  return { ok: false, error: "Nội dung chưa hợp lệ." };
}

/**
 * Generic validator for future media support (F1.2 keeps `mediaIds <= 4`).
 */
export function validateComposerInput(body: string, mediaIds: string[]): ComposerValidation {
  if (mediaIds.length > COMPOSER_MAX_MEDIA) {
    return { ok: false, error: `Chỉ đính kèm tối đa ${COMPOSER_MAX_MEDIA} ảnh.` };
  }
  const parsed = parseCreatePostInput({ body, mediaIds });
  if (parsed) return { ok: true, value: parsed };
  return validateComposerBody(body);
}

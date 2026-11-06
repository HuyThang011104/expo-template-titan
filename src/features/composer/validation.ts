/**
 * Composer input validation (F1.1 text-only).
 *
 * Wraps `parseCreatePostInput` from `entities/post` so the screen only deals
 * with display strings. Zod failure → `null` + `logger.warn` inside the entity;
 * here we map to an inline message (no throw).
 */

import { parseCreatePostInput, type CreatePostInput } from "@/entities/post";
import type { PickedMedia } from "@/shared/media";

export const COMPOSER_MAX_LENGTH = 280;
export const COMPOSER_MAX_MEDIA = 4;
export const COMPOSER_MAX_VIDEO = 1;
export const COMPOSER_MAX_VIDEO_DURATION_MS = 90_000;
export const COMPOSER_MAX_VIDEO_BYTES = 100 * 1024 * 1024;
export const COMPOSER_MEDIA_MIXED_MESSAGE =
  "Choose either one video or up to 4 photos, not both.";

export type ComposerValidation =
  | { ok: true; value: CreatePostInput }
  | { ok: false; error: string };

export type ComposerContentValidation =
  | { ok: true; body: string }
  | { ok: false; error: string };

/**
 * Validate the final post content (P4): text 1–280 and/or media (one video XOR
 * up to 4 photos). Empty caption is allowed when media is attached.
 */
export function validateComposerContent(
  body: string,
  mediaCount: number,
): ComposerContentValidation {
  if (mediaCount > COMPOSER_MAX_MEDIA) {
    return { ok: false, error: `Attach at most ${COMPOSER_MAX_MEDIA} media items.` };
  }
  const trimmed = body.trim();
  if (trimmed.length > COMPOSER_MAX_LENGTH) {
    return { ok: false, error: `Posts are limited to ${COMPOSER_MAX_LENGTH} characters.` };
  }
  if (trimmed.length === 0 && mediaCount === 0) {
    return { ok: false, error: "Write something or add media." };
  }
  const parsed = parseCreatePostInput({
    body: trimmed,
    // Only the count matters here; the screen sends the real upload ids.
    mediaIds: Array.from({ length: mediaCount }, (_, index) => `local-${index}`),
  });
  if (!parsed) return { ok: false, error: "That content isn't valid." };
  return { ok: true, body: parsed.body };
}

/**
 * Validate text-only composer body (`mediaIds: []`).
 * Returns the trimmed `CreatePostInput` or an inline message.
 */
export function validateComposerBody(body: string): ComposerValidation {
  const parsed = parseCreatePostInput({ body, mediaIds: [] });
  if (parsed) return { ok: true, value: parsed };
  const trimmed = body.trim();
  if (trimmed.length === 0) return { ok: false, error: "Write something first." };
  if (trimmed.length > COMPOSER_MAX_LENGTH) {
    return { ok: false, error: `Posts are limited to ${COMPOSER_MAX_LENGTH} characters.` };
  }
  return { ok: false, error: "That content isn't valid." };
}

/**
 * Validator for id-based media (kept for API parity/tests). Delegates to the
 * content validator so media-only posts pass when `mediaIds` is non-empty.
 */
export function validateComposerInput(body: string, mediaIds: string[]): ComposerValidation {
  if (mediaIds.length > COMPOSER_MAX_MEDIA) {
    return { ok: false, error: `Attach at most ${COMPOSER_MAX_MEDIA} media items.` };
  }
  const content = validateComposerContent(body, mediaIds.length);
  if (!content.ok) return content;
  return { ok: true, value: { body: content.body, mediaIds } };
}

export type ComposerVideoMeta = {
  durationMs: number;
  fileSize: number | null;
};

/** Video limits (P3): one video, ≤90s, ≤100MB. */
export function validateComposerVideo(meta: ComposerVideoMeta): string | null {
  if (meta.durationMs > COMPOSER_MAX_VIDEO_DURATION_MS) {
    return `Video must be ${COMPOSER_MAX_VIDEO_DURATION_MS / 1000} seconds or shorter.`;
  }
  if (meta.fileSize !== null && meta.fileSize > COMPOSER_MAX_VIDEO_BYTES) {
    return `Video must be ${COMPOSER_MAX_VIDEO_BYTES / (1024 * 1024)}MB or smaller.`;
  }
  return null;
}

/** Session media rules (P3): 1 video XOR up to 4 photos, never mixed. */
export function validateComposerMedia(media: PickedMedia[]): string | null {
  const videos = media.filter((asset) => asset.kind === "video");
  const images = media.filter((asset) => asset.kind === "image");
  if (videos.length > 0 && images.length > 0) return COMPOSER_MEDIA_MIXED_MESSAGE;
  if (videos.length > COMPOSER_MAX_VIDEO) return "Attach at most one video.";
  if (images.length > COMPOSER_MAX_MEDIA) {
    return `Attach at most ${COMPOSER_MAX_MEDIA} photos.`;
  }
  return null;
}

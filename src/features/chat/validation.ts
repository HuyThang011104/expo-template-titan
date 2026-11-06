/**
 * Chat image validation (G3.1).
 *
 * Pure: maps a picked asset to a Vietnamese inline message.
 * Keeps the composer text untouched — callers show `error` and keep `value`.
 */

import type { PickedMedia } from "@/shared/media/picker";

export const CHAT_IMAGE_MAX_BYTES = 10 * 1024 * 1024;

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/heic"]);

export type ChatImageValidation = { ok: true } | { ok: false; error: string };

/** Validate one picked image (kind + size). Unknown size skips the weight check. */
export function validateChatImage(asset: PickedMedia): ChatImageValidation {
  if (asset.kind !== "image") {
    return { ok: false, error: "Chỉ gửi được ảnh (JPEG/PNG/WebP/HEIC)." };
  }
  if (!ALLOWED_MIME.has(asset.mimeType)) {
    return { ok: false, error: "Định dạng ảnh không hỗ trợ. Hãy chọn JPEG/PNG/WebP/HEIC." };
  }
  if (typeof asset.fileSize === "number" && asset.fileSize > CHAT_IMAGE_MAX_BYTES) {
    return { ok: false, error: "Ảnh quá nặng (tối đa 10MB). Hãy chọn ảnh nhẹ hơn." };
  }
  return { ok: true };
}

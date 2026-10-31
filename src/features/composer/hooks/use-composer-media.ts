/**
 * Composer session media (F1.2 + P3 video).
 *
 * Holds the `PickedMedia[]` for this composer session only (upload needs the
 * full asset, not just uris). Durability of the uri list lives in
 * `useComposerDraft` — the screen syncs on pick/remove.
 *
 * Rules: one video XOR up to 4 photos, never mixed. Video must pass the
 * client limits (≤90s, ≤100MB) before it enters the session.
 *
 * - `pickMore` appends images (`allowsMultiple`, quality 0.8), capped at 4.
 * - `pickVideo` selects one video from the library; `recordVideo` uses the OS
 *   camera with `videoMaxDuration: 90`.
 * - `addAsset` appends a captured photo (same cap/filter rules).
 * - Uploading happens in `useComposerCreatePost.submitWithMedia`, not here.
 */

import { useCallback, useRef, useState } from "react";

import {
  getLocalVideoMetadata,
  pickFromLibrary,
  takeVideo,
  type PickedMedia,
} from "@/shared/media";

import {
  COMPOSER_MAX_MEDIA,
  COMPOSER_MAX_VIDEO_DURATION_MS,
  COMPOSER_MEDIA_MIXED_MESSAGE,
  validateComposerVideo,
} from "../validation";

export type ComposerMediaMode = "empty" | "images" | "video";

export function useComposerMedia() {
  const [items, setItems] = useState<PickedMedia[]>([]);
  const itemsRef = useRef<PickedMedia[]>([]);
  const [error, setError] = useState<string | null>(null);

  const mode: ComposerMediaMode =
    items.length === 0 ? "empty" : items[0]?.kind === "video" ? "video" : "images";
  const canAddImages = mode !== "video" && items.length < COMPOSER_MAX_MEDIA;
  const canAddVideo = mode === "empty";
  // Backwards-compatible alias for surfaces that only add photos.
  const canAddMore = canAddImages;

  // Single writer: every update goes through `commit` below, so the ref
  // never drifts from state (no render-time ref assignment).
  function commit(next: PickedMedia[]): PickedMedia[] {
    itemsRef.current = next;
    setItems(next);
    return next;
  }

  /**
   * Opens the library and appends images (capped). Resolves the new full
   * list so the screen can sync draft uris without a stale closure.
   */
  const pickMore = useCallback(async (): Promise<PickedMedia[]> => {
    const current = itemsRef.current;
    if (current.length >= COMPOSER_MAX_MEDIA || current[0]?.kind === "video") {
      return current;
    }
    const picked = await pickFromLibrary("images", { allowsMultiple: true, quality: 0.8 });
    const images = picked.filter((asset) => asset.kind === "image");
    const next = [...itemsRef.current, ...images].slice(0, COMPOSER_MAX_MEDIA);
    setError(null);
    return commit(next);
  }, []);

  /**
   * Appends one captured photo (camera). Ignored when denied/cancelled, when
   * the asset is not an image, when a video is already picked, or when the cap
   * is already reached. Resolves the new full list for draft sync.
   */
  const addAsset = useCallback((asset: PickedMedia | null): PickedMedia[] => {
    const current = itemsRef.current;
    if (
      !asset ||
      asset.kind !== "image" ||
      current[0]?.kind === "video" ||
      current.length >= COMPOSER_MAX_MEDIA
    ) {
      return current;
    }
    setError(null);
    return commit([...current, asset]);
  }, []);

  const acceptVideo = useCallback(async (asset: PickedMedia | null): Promise<PickedMedia[]> => {
    if (!asset || asset.kind !== "video") return itemsRef.current;
    if (itemsRef.current.length > 0) {
      setError(COMPOSER_MEDIA_MIXED_MESSAGE);
      return itemsRef.current;
    }
    const meta = await getLocalVideoMetadata(asset);
    const validationError = validateComposerVideo(meta);
    if (validationError) {
      setError(validationError);
      return itemsRef.current;
    }
    setError(null);
    return commit([asset]);
  }, []);

  /**
   * Picks one video from the library. Rejected when photos are already picked
   * (one video XOR up to 4 photos) or when the video exceeds the client limits.
   */
  const pickVideo = useCallback(async (): Promise<PickedMedia[]> => {
    if (itemsRef.current.length > 0) {
      setError(COMPOSER_MEDIA_MIXED_MESSAGE);
      return itemsRef.current;
    }
    const picked = await pickFromLibrary("videos", { allowsMultiple: false });
    return acceptVideo(picked[0] ?? null);
  }, [acceptVideo]);

  /**
   * Records one video with the OS camera (≤90s) and validates it like a pick.
   */
  const recordVideo = useCallback(async (): Promise<PickedMedia[]> => {
    if (itemsRef.current.length > 0) {
      setError(COMPOSER_MEDIA_MIXED_MESSAGE);
      return itemsRef.current;
    }
    const asset = await takeVideo({ videoMaxDuration: COMPOSER_MAX_VIDEO_DURATION_MS / 1000 });
    return acceptVideo(asset);
  }, [acceptVideo]);

  /**
   * Removes one thumb. Resolves the new full list for draft sync.
   */
  const removeAt = useCallback((index: number): PickedMedia[] => {
    const next = itemsRef.current.filter((_, i) => i !== index);
    setError(null);
    return commit(next);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    items,
    mode,
    canAddMore,
    canAddImages,
    canAddVideo,
    pickMore,
    pickVideo,
    addAsset,
    recordVideo,
    removeAt,
    error,
    clearError,
    count: items.length,
  };
}

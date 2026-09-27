/**
 * Composer session media (F1.2).
 *
 * Holds the `PickedMedia[]` for this composer session only (upload needs the
 * full asset, not just uris). Durability of the uri list lives in
 * `useComposerDraft` — the screen syncs on pick/remove.
 *
 * - `pickFromLibrary("images", allowsMultiple, quality 0.8)`; denial/cancel
 *   resolves `[]` silently per `shared/media/picker` (no error shown).
 * - Images only; caps at `COMPOSER_MAX_MEDIA` (extra picks are dropped).
 * - Uploading happens in `useComposerCreatePost.submitWithMedia`, not here.
 */

import { useCallback, useRef, useState } from "react";

import { pickFromLibrary, type PickedMedia } from "@/shared/media/picker";

import { COMPOSER_MAX_MEDIA } from "../validation";

export function useComposerMedia() {
  const [items, setItems] = useState<PickedMedia[]>([]);
  // Single writer: every update goes through `commit` below, so the ref
  // never drifts from state (no render-time ref assignment).
  const itemsRef = useRef<PickedMedia[]>([]);

  const canAddMore = items.length < COMPOSER_MAX_MEDIA;

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
    const picked = await pickFromLibrary("images", { allowsMultiple: true, quality: 0.8 });
    const images = picked.filter((asset) => asset.kind === "image");
    const next = [...itemsRef.current, ...images].slice(0, COMPOSER_MAX_MEDIA);
    return commit(next);
  }, []);

  /**
   * Removes one thumb. Resolves the new full list for draft sync.
   */
  const removeAt = useCallback((index: number): PickedMedia[] => {
    const next = itemsRef.current.filter((_, i) => i !== index);
    return commit(next);
  }, []);

  return { items, canAddMore, pickMore, removeAt, count: items.length };
}

/**
 * Single-image attachment for one chat send (G3.1).
 *
 * - `pickFromLibrary("images")` once; denial/cancel resolves silently (`[]`).
 * - Wrong kind/size maps to a Vietnamese inline `error`; text draft stays intact.
 * - One image per message (keeps the mock `{ body, imageUrl }` shape).
 */

import { useCallback, useState } from "react";

import { pickFromLibrary, type PickedMedia } from "@/shared/media/picker";

import { validateChatImage } from "../validation";

export function useChatImage() {
  const [asset, setAsset] = useState<PickedMedia | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);

  const pick = useCallback(async (): Promise<void> => {
    setPicking(true);
    try {
      const picked = await pickFromLibrary("images", { allowsMultiple: false, quality: 0.8 });
      const first = picked[0] ?? null;
      if (!first) return;
      const checked = validateChatImage(first);
      if (!checked.ok) {
        setAsset(null);
        setError(checked.error);
        return;
      }
      setAsset(first);
      setError(null);
    } finally {
      setPicking(false);
    }
  }, []);

  const remove = useCallback(() => {
    setAsset(null);
    setError(null);
  }, []);

  const setInlineError = useCallback((message: string | null) => {
    setError(message);
  }, []);

  return { asset, error, picking, pick, remove, setInlineError };
}

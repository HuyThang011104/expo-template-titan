/**
 * Composer draft hook (F1.1 text + F1.2 media uris).
 *
 * - Single durable key `composer:draft` (opaque JSON string).
 * - Loads once on mount; saves debounced 500ms; `clear()` removes the key.
 * - Draft holds text + local uris. Tmp picker files may vanish after kill —
 *   text survives, the screen warns that photos may need re-picking.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import { deleteDraft, loadDraft, saveDraft } from "@/shared/storage/db/drafts";

export const COMPOSER_DRAFT_KEY = "composer:draft";

const SAVE_DEBOUNCE_MS = 500;

export type ComposerDraftShape = {
  body: string;
  localUris: string[];
};

function parseShape(raw: string | null): ComposerDraftShape {
  if (!raw) return { body: "", localUris: [] };
  try {
    const parsed = JSON.parse(raw) as Partial<ComposerDraftShape>;
    return {
      body: typeof parsed.body === "string" ? parsed.body : "",
      localUris: Array.isArray(parsed.localUris)
        ? parsed.localUris.filter((uri): uri is string => typeof uri === "string")
        : [],
    };
  } catch {
    // Backward compat: very old drafts stored the raw body string.
    return { body: raw, localUris: [] };
  }
}

export function useComposerDraft() {
  const [body, setBodyState] = useState("");
  const [localUris, setLocalUrisState] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftRef = useRef<ComposerDraftShape>({ body: "", localUris: [] });

  useEffect(() => {
    let cancelled = false;
    void loadDraft(COMPOSER_DRAFT_KEY)
      .then((raw) => {
        if (cancelled) return;
        const shape = parseShape(raw);
        draftRef.current = shape;
        setBodyState(shape.body);
        setLocalUrisState(shape.localUris);
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const scheduleSave = useCallback((next: ComposerDraftShape) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void saveDraft(COMPOSER_DRAFT_KEY, JSON.stringify(next)).catch(() => {});
    }, SAVE_DEBOUNCE_MS);
  }, []);

  const setBody = useCallback(
    (next: string) => {
      const merged: ComposerDraftShape = { ...draftRef.current, body: next };
      draftRef.current = merged;
      setBodyState(next);
      scheduleSave(merged);
    },
    [scheduleSave],
  );

  const setLocalUris = useCallback(
    (next: string[]) => {
      const merged: ComposerDraftShape = { ...draftRef.current, localUris: next };
      draftRef.current = merged;
      setLocalUrisState(next);
      scheduleSave(merged);
    },
    [scheduleSave],
  );

  const clear = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    draftRef.current = { body: "", localUris: [] };
    setBodyState("");
    setLocalUrisState([]);
    await deleteDraft(COMPOSER_DRAFT_KEY).catch(() => {});
  }, []);

  return { body, setBody, localUris, setLocalUris, loaded, clear };
}

/**
 * Composer draft hook (F1.1 text-only, forward-compatible with F1.2 media).
 *
 * - Single durable key `composer:draft` (opaque JSON string).
 * - Loads once on mount; saves debounced 500ms; `clear()` removes the key.
 * - Draft holds text + local uris; F1.1 only edits `body`, `localUris` stays `[]`.
 * - Tmp picker files may vanish after kill — text survives, UI warns on re-pick.
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
  const [loaded, setLoaded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bodyRef = useRef("");

  useEffect(() => {
    let cancelled = false;
    void loadDraft(COMPOSER_DRAFT_KEY)
      .then((raw) => {
        if (cancelled) return;
        const shape = parseShape(raw);
        bodyRef.current = shape.body;
        setBodyState(shape.body);
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

  const scheduleSave = useCallback((nextBody: string) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const payload: ComposerDraftShape = { body: nextBody, localUris: [] };
      void saveDraft(COMPOSER_DRAFT_KEY, JSON.stringify(payload)).catch(() => {});
    }, SAVE_DEBOUNCE_MS);
  }, []);

  const setBody = useCallback(
    (next: string) => {
      bodyRef.current = next;
      setBodyState(next);
      scheduleSave(next);
    },
    [scheduleSave],
  );

  const clear = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    bodyRef.current = "";
    setBodyState("");
    await deleteDraft(COMPOSER_DRAFT_KEY).catch(() => {});
  }, []);

  return { body, setBody, loaded, clear };
}

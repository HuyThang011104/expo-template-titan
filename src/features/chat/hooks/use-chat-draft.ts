/**
 * Per-thread draft hook (F4).
 *
 * - Key `chat.draft.<conversationId>` (durable sqlite on native, kv on web).
 * - Loads once on mount; saves debounced 500ms; `clear()` removes the key.
 * - Mirrors `useComposerDraft` so chat drafts survive kill/reopen.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import { deleteDraft, loadDraft, saveDraft } from "@/shared/storage/db/drafts";

const SAVE_DEBOUNCE_MS = 500;

export function chatDraftKey(conversationId: string): string {
  return `chat.draft.${conversationId}`;
}

export function useChatDraft(conversationId: string) {
  const [body, setBodyState] = useState("");
  const [loaded, setLoaded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bodyRef = useRef("");

  const requestRef = useRef(0);
  useEffect(() => {
    let cancelled = false;
    if (!conversationId) return () => {
      cancelled = true;
    };
    // Clear the previous thread text optimistically; the async load below
    // overwrites with the stored draft (async callback, not a sync setState).
    bodyRef.current = "";
    requestRef.current += 1;
    const requestId = requestRef.current;
    const threadId = conversationId;
    void loadDraft(chatDraftKey(threadId))
      .then((raw) => {
        if (cancelled || requestRef.current !== requestId) return;
        bodyRef.current = raw ?? "";
        setBodyState(raw ?? "");
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled && requestRef.current === requestId) setLoaded(true);
      });
    return () => {
      cancelled = true;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [conversationId]);

  const setBody = useCallback(
    (next: string) => {
      bodyRef.current = next;
      setBodyState(next);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        void saveDraft(chatDraftKey(conversationId), next).catch(() => {});
      }, SAVE_DEBOUNCE_MS);
    },
    [conversationId],
  );

  const clear = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    bodyRef.current = "";
    setBodyState("");
    await deleteDraft(chatDraftKey(conversationId)).catch(() => {});
  }, [conversationId]);

  return { body, setBody, loaded, clear };
}

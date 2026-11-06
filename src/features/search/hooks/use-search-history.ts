/**
 * Search history hook (G2.2).
 *
 * Binds the kv-backed store to one viewer id. Loads on mount/user change;
 * `record`/`removeOne`/`clearAll` update state + persist synchronously so
 * the list never needs a refetch. Empty userId disables writes.
 */

import { useCallback, useState } from "react";

import {
  clearSearchHistory,
  loadSearchHistory,
  recordSearchHistory,
  removeSearchHistoryItem,
} from "../history/search-history-store";

export function useSearchHistory(userId: string) {
  const [userKey, setUserKey] = useState(userId);
  const [history, setHistory] = useState<string[]>(() => loadSearchHistory(userId));

  // Render-phase reset on viewer change (no effect → no cascading renders).
  if (userKey !== userId) {
    setUserKey(userId);
    setHistory(loadSearchHistory(userId));
  }

  const record = useCallback(
    (query: string) => {
      if (!userId.trim()) return;
      setHistory(recordSearchHistory(userId, query));
    },
    [userId],
  );

  const removeOne = useCallback(
    (query: string) => {
      if (!userId.trim()) return;
      setHistory(removeSearchHistoryItem(userId, query));
    },
    [userId],
  );

  const clearAll = useCallback(() => {
    if (!userId.trim()) return;
    setHistory(clearSearchHistory(userId));
  }, [userId]);

  return { history, record, removeOne, clearAll };
}

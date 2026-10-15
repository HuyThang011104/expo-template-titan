/**
 * Search history store (G2.2).
 *
 * Local per-user history over `shared/storage/kv` (sync Map native,
 * `localStorage` web). Pure functions + small IO wrapper so tests run
 * without React. Most-recent-first, case-insensitive dedupe, capped.
 */

import { deleteKvItem, getKvItem, setKvItem } from "@/shared/storage/kv";

export const SEARCH_HISTORY_MAX = 20;

function sanitizeUserId(userId: string): string {
  const clean = userId.trim().replace(/[^A-Za-z0-9._-]/g, "_");
  return clean.length > 0 ? clean : "anonymous";
}

export function searchHistoryKey(userId: string): string {
  return `search-history.${sanitizeUserId(userId)}`;
}

export function normalizeHistoryQuery(query: string): string {
  return query.trim();
}

/** Read history for one user (never throws — corrupt JSON resets to []). */
export function loadSearchHistory(userId: string): string[] {
  if (!userId.trim()) return [];
  let raw: string | null = null;
  try {
    raw = getKvItem(searchHistoryKey(userId));
  } catch {
    return [];
  }
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0);
  } catch {
    return [];
  }
}

function persist(userId: string, items: string[]): string[] {
  try {
    setKvItem(searchHistoryKey(userId), JSON.stringify(items));
  } catch {
    // Best effort: history must never break search.
  }
  return items;
}

/** Record a tapped/submitted query; returns the updated list. */
export function recordSearchHistory(userId: string, query: string): string[] {
  const normalized = normalizeHistoryQuery(query);
  if (!userId.trim() || normalized.length === 0) return loadSearchHistory(userId);
  const lower = normalized.toLowerCase();
  const prev = loadSearchHistory(userId).filter((entry) => entry.toLowerCase() !== lower);
  return persist(userId, [normalized, ...prev].slice(0, SEARCH_HISTORY_MAX));
}

/** Remove one entry (case-insensitive); returns the updated list. */
export function removeSearchHistoryItem(userId: string, query: string): string[] {
  if (!userId.trim()) return [];
  const lower = query.trim().toLowerCase();
  const next = loadSearchHistory(userId).filter((entry) => entry.toLowerCase() !== lower);
  return persist(userId, next);
}

/** Clear all history for one user; returns []. */
export function clearSearchHistory(userId: string): string[] {
  if (!userId.trim()) return [];
  try {
    deleteKvItem(searchHistoryKey(userId));
  } catch {
    // Best effort.
  }
  return [];
}

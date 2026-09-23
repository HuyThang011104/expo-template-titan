/**
 * Durable drafts (composer/chat). sqlite on native, `kv` on web.
 * Uniformly async; values are opaque strings (callers JSON-encode).
 */

import { deleteKvItem, getKvItem, setKvItem } from "../kv";
import { getDatabase } from "./client";

const KEY_PATTERN = /^[A-Za-z0-9._-]+$/;

function assertValidKey(key: string): void {
  if (!KEY_PATTERN.test(key)) {
    throw new Error(
      `[drafts] Invalid key "${key}". Keys may only contain alphanumeric characters, ".", "-" and "_".`,
    );
  }
}

function isWeb(): boolean {
  return process.env.EXPO_OS === "web";
}

export async function saveDraft(key: string, value: string): Promise<void> {
  assertValidKey(key);
  if (isWeb()) {
    setKvItem(key, value);
    return;
  }
  const db = await getDatabase();
  await db.runAsync(
    "INSERT OR REPLACE INTO drafts (key, value, updated_at) VALUES (?, ?, ?)",
    key,
    value,
    Date.now(),
  );
}

export async function loadDraft(key: string): Promise<string | null> {
  assertValidKey(key);
  if (isWeb()) return getKvItem(key);
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ value: string }>(
    "SELECT value FROM drafts WHERE key = ? LIMIT 1",
    key,
  );
  return rows[0]?.value ?? null;
}

export async function deleteDraft(key: string): Promise<void> {
  assertValidKey(key);
  if (isWeb()) {
    deleteKvItem(key);
    return;
  }
  const db = await getDatabase();
  await db.runAsync("DELETE FROM drafts WHERE key = ?", key);
}

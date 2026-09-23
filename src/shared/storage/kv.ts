/**
 * Non-secret key-value storage.
 *
 * For draft flags and UI prefs — never tokens/sessions (use `secure.ts`).
 * Native is an in-memory `Map`; web uses `localStorage`.
 * Intentionally sync to contrast with the async `secure.ts` API.
 *
 * TODO (chat drafts): migrate to AsyncStorage/MMKV for real native persistence.
 */

const KEY_PATTERN = /^[A-Za-z0-9._-]+$/;

const memory = new Map<string, string>();

function assertValidKey(key: string): void {
  if (!KEY_PATTERN.test(key)) {
    throw new Error(
      `[kv] Invalid key "${key}". Keys may only contain alphanumeric characters, ".", "-" and "_".`,
    );
  }
}

function isWeb(): boolean {
  return process.env.EXPO_OS === "web";
}

export function getKvItem(key: string): string | null {
  assertValidKey(key);
  if (isWeb()) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }
  return memory.has(key) ? (memory.get(key) as string) : null;
}

export function setKvItem(key: string, value: string): void {
  assertValidKey(key);
  if (isWeb()) {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Private mode/quota: best effort, never throws for non-secrets.
    }
    return;
  }
  memory.set(key, value);
}

export function deleteKvItem(key: string): void {
  assertValidKey(key);
  if (isWeb()) {
    try {
      localStorage.removeItem(key);
    } catch {
      // Best effort, see `setKvItem`.
    }
    return;
  }
  memory.delete(key);
}

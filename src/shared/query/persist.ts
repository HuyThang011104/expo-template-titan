/**
 * TanStack Query persistence across restarts.
 *
 * ASSUMPTIONS (explicit until measured otherwise):
 * - Only identity/profile-shaped queries persist (`shouldPersistQueryKey`).
 *   Feed timelines NEVER persist — stale social data is worse than a refetch.
 * - Backing store is `storage/db/drafts` (sqlite native, `kv` on web), so no
 *   new native dep was needed. Values are opaque JSON strings under one key.
 * - Restore runs in the background after mount (see `startQueryPersistence`
 *   wired in `app-providers.tsx`): first paint may fetch, cache fills in after.
 *   Upgrade to boot-blocking restore only if cold-start data proves slow.
 * - Bump `CACHE_BUSTER` whenever a persisted query shape changes, or users
 *   keep the old shape for up to `MAX_AGE_MS`.
 */

import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { persistQueryClient } from "@tanstack/react-query-persist-client";

import { logger } from "../observability/logger";
import { deleteDraft, loadDraft, saveDraft } from "../storage/db/drafts";
import { queryClient } from "./query-client";

/** Storage key + version. Bump the buster on persisted-shape changes. */
const PERSIST_KEY = "titan.query-cache";
const CACHE_BUSTER = "titan-cache-v1";
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

/** Pure allowlist (exported for tests): identity/profile keys only. */
export function shouldPersistQueryKey(queryKey: readonly unknown[]): boolean {
  const [head] = queryKey;
  return head === "session" || head === "me" || head === "users";
}

/** AsyncStorage-shaped adapter over the drafts store. */
export const queryPersistStorage = {
  getItem: (key: string): Promise<string | null> => loadDraft(key),
  setItem: (key: string, value: string): Promise<void> => saveDraft(key, value),
  removeItem: (key: string): Promise<void> => deleteDraft(key),
};

/**
 * Start background restore + throttled writes for the app lifetime.
 * Never throws — persistence is best-effort and must not block boot.
 */
export function startQueryPersistence(): void {
  try {
    const persister = createAsyncStoragePersister({
      storage: queryPersistStorage,
      key: PERSIST_KEY,
      throttleTime: 2000,
    });
    persistQueryClient({
      queryClient,
      persister,
      maxAge: MAX_AGE_MS,
      buster: CACHE_BUSTER,
      dehydrateOptions: {
        shouldDehydrateQuery: (query) => shouldPersistQueryKey(query.queryKey),
      },
    });
  } catch {
    logger.warn("[query] persistence disabled", { key: PERSIST_KEY });
  }
}

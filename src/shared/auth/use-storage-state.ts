import { useCallback, useEffect, useReducer } from "react";

import { logger } from "../observability/logger";
import { deleteSecureItem, getSecureItem, setSecureItem } from "../storage/secure";

/**
 * Persists a string via `secure.ts`, keeping the `[[isLoading, value], setValue]` shape.
 * Routes through `secure.ts` (never `expo-secure-store` directly) for key
 * validation, web fallback, and logging.
 *
 * - Mount reads async; failures warn and resolve `[false, null]` without crashing.
 * - Setter updates state optimistically and persists fire-and-forget.
 */

type StorageState = [boolean, string | null];
type UseStorageStateHook = [StorageState, (value: string | null) => void];

function storageStateReducer(state: StorageState, action: string | null): StorageState {
  void state;
  return [false, action];
}

export function useStorageState(key: string): UseStorageStateHook {
  const [state, setState] = useReducer(storageStateReducer, [true, null] as StorageState);

  useEffect(() => {
    let mounted = true;
    getSecureItem(key).then(
      (value) => {
        if (mounted) setState(value);
      },
      (error: unknown) => {
        logger.warn("[auth] storage read failed", { key });
        if (mounted) setState(null);
        void error;
      },
    );
    return () => {
      mounted = false;
    };
  }, [key]);

  const setValue = useCallback(
    (value: string | null) => {
      setState(value);
      const persist =
        value === null ? deleteSecureItem(key) : setSecureItem(key, value);
      persist.catch(() => {
        logger.warn("[auth] storage write failed", { key });
      });
    },
    [key],
  );

  return [state, setValue];
}

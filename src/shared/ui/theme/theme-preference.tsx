/**
 * Theme preference override (G2.4 sáng/tối).
 *
 * System scheme stays the default; the settings screen persists an explicit
 * choice in kv (`theme.override`). `ThemeProvider` consumes this context
 * optionally (tests rendering it alone keep `initialName` behavior).
 */

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import { deleteKvItem, getKvItem, setKvItem } from "../../storage/kv";
import type { ThemeName } from "./tokens";

const THEME_KEY = "theme.override";

export type ThemePreference = ThemeName | "system";

function readPreference(): ThemePreference {
  try {
    const raw = getKvItem(THEME_KEY);
    if (raw === "light" || raw === "dark" || raw === "system") return raw;
    return "system";
  } catch {
    return "system";
  }
}

type ThemePreferenceContextValue = {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
};

const ThemePreferenceContext = createContext<ThemePreferenceContextValue | null>(null);

export function ThemePreferenceProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(readPreference);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    try {
      if (next === "system") deleteKvItem(THEME_KEY);
      else setKvItem(THEME_KEY, next);
    } catch {
      // Best effort: theme must never break settings.
    }
  }, []);

  const value = useMemo<ThemePreferenceContextValue>(
    () => ({ preference, setPreference }),
    [preference, setPreference],
  );

  return <ThemePreferenceContext.Provider value={value}>{children}</ThemePreferenceContext.Provider>;
}

export function useThemePreference(): ThemePreferenceContextValue {
  const value = useContext(ThemePreferenceContext);
  if (!value) throw new Error("useThemePreference must be used within ThemePreferenceProvider");
  return value;
}

/** Optional read for `ThemeProvider` (never throws when mounted alone). */
export function useThemePreferenceOptional(): ThemePreferenceContextValue | null {
  return useContext(ThemePreferenceContext);
}

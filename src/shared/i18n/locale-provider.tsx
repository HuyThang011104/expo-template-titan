/**
 * Locale override (G2.4 vi/en).
 *
 * Device locale stays the default (`getDeviceLocale`); the settings screen
 * persists an explicit override in kv (`locale.override`). `useLocale()`
 * feeds `t(key, locale)` so switched strings apply without a restart.
 * No i18n library — same stub discipline as `index.ts`.
 */

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import { deleteKvItem, getKvItem, setKvItem } from "../storage/kv";
import { getDeviceLocale, type Locale } from "./index";

const LOCALE_KEY = "locale.override";

export type LocaleOverride = Locale | null;

function readOverride(): LocaleOverride {
  try {
    const raw = getKvItem(LOCALE_KEY);
    // The stub ships vi/en/es; settings exposes vi/en (G2.4 scope).
    if (raw === "vi" || raw === "en") return raw;
    return null;
  } catch {
    return null;
  }
}

type LocaleContextValue = {
  /** Explicit override, or null when following the device. */
  override: LocaleOverride;
  /** Effective locale: override wins, otherwise the device. */
  locale: Locale;
  setOverride: (locale: LocaleOverride) => void;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [override, setOverrideState] = useState<LocaleOverride>(readOverride);

  const setOverride = useCallback((locale: LocaleOverride) => {
    setOverrideState(locale);
    try {
      if (locale) setKvItem(LOCALE_KEY, locale);
      else deleteKvItem(LOCALE_KEY);
    } catch {
      // Best effort: locale must never break settings.
    }
  }, []);

  const value = useMemo<LocaleContextValue>(
    () => ({ override, locale: override ?? getDeviceLocale(), setOverride }),
    [override, setOverride],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const value = useContext(LocaleContext);
  if (!value) throw new Error("useLocale must be used within LocaleProvider");
  return value;
}

/** Optional read for providers mounted above `LocaleProvider` (never throws). */
export function useLocaleOptional(): LocaleContextValue | null {
  return useContext(LocaleContext);
}

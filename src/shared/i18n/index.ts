import { getLocales } from "expo-localization";

import en from "./locales/en.json";
import es from "./locales/es.json";
import vi from "./locales/vi.json";

/**
 * Minimal i18n stub: device vi/en/es detection, dotted-key lookup, en fallback.
 * No i18n library and no `useLocale` hook.
 * TODO: full ICU/plural/RTL support without hardcoded UI strings.
 */

export type Locale = "en" | "vi" | "es";

type Dict = Record<string, unknown>;

const dicts: Record<Locale, Dict> = {
  en: en as Dict,
  vi: vi as Dict,
  es: es as Dict,
};

export function getDeviceLocale(): Locale {
  try {
    const code = getLocales()[0]?.languageCode?.toLowerCase() ?? "";
    if (code.startsWith("vi")) return "vi";
    if (code.startsWith("es")) return "es";
    return "en";
  } catch {
    return "en";
  }
}

function lookup(dict: Dict, key: string): string | null {
  let node: unknown = dict;
  for (const part of key.split(".")) {
    if (node === null || typeof node !== "object") return null;
    node = (node as Dict)[part];
  }
  return typeof node === "string" ? node : null;
}

export function t(key: string, locale?: Locale): string {
  const active = locale ?? getDeviceLocale();
  return lookup(dicts[active], key) ?? lookup(dicts.en, key) ?? key;
}

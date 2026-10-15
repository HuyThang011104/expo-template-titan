import { createContext, useContext, useMemo, type ReactNode } from "react";

import { colors, radius, spacing, typography, type Theme, type ThemeName } from "./tokens";
import { useColorScheme } from "./use-color-scheme";
import { useThemePreferenceOptional } from "./theme-preference";

const ThemeContext = createContext<Theme | null>(null);

type ThemeProviderProps = {
  children: ReactNode;
  /** Scheme override, mainly for tests. Runtime uses `useColorScheme()`. */
  initialName?: ThemeName;
};

function resolveName(scheme: string | null | undefined, fallback: ThemeName): ThemeName {
  if (scheme === "dark" || scheme === "light") return scheme;
  return fallback;
}

export function ThemeProvider({ children, initialName }: ThemeProviderProps) {
  const scheme = useColorScheme();
  // G2.4: explicit user choice wins; tests keep `initialName` behavior.
  const preference = useThemePreferenceOptional()?.preference ?? "system";

  const value = useMemo<Theme>(() => {
    const name =
      initialName ??
      (preference === "system" ? resolveName(scheme, "light") : preference);
    return {
      name,
      color: colors[name],
      space: spacing,
      radius,
      type: typography,
    };
  }, [initialName, preference, scheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeName(): ThemeName {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error("useThemeName must be used within ThemeProvider");
  return theme.name;
}

/** Internal export for `use-theme.ts`. Components must not import it directly. */
export function useThemeContext(): Theme | null {
  return useContext(ThemeContext);
}

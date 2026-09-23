import { useThemeContext } from "./theme-provider";
import type { Theme } from "./tokens";

export function useTheme(): Theme {
  const theme = useThemeContext();
  if (!theme) throw new Error("useTheme must be used within ThemeProvider");
  return theme;
}

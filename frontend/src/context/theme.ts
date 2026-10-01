import { createContext, useContext } from "react";
import type { ResolvedTheme, ThemePreference } from "@/domain/theme";

/**
 * The theme as ThemeProvider owns it. Read it only to change the theme or to feed code that needs a
 * resolved colour; how anything looks comes from the tokens and `dark:` variants.
 */
export interface ThemeValue {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
  /** Switches to the opposite of what is showing, as an explicit choice. */
  toggle: () => void;
}

export const THEME_STORAGE_KEY = "theme";

export const ThemeContext = createContext<ThemeValue | null>(null);

export function useTheme(): ThemeValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme must be used inside ThemeProvider.");
  return value;
}

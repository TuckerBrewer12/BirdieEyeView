import { useCallback, useState } from "react";
import { applyTheme, getStoredPublicTheme, setStoredPublicTheme, type AppTheme } from "./theme";

export interface PublicTheme {
  isDark: boolean;
  /** Flips the theme, saves it as the signed-out preference, and applies it to the document. */
  toggle: () => void;
}

/** The signed-out theme preference, for the public pages' toggle. */
export function usePublicTheme(): PublicTheme {
  const [theme, setTheme] = useState<AppTheme>(() => getStoredPublicTheme());

  const toggle = useCallback(() => {
    const next: AppTheme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    setStoredPublicTheme(next);
    applyTheme(next);
  }, [theme]);

  return { isDark: theme === "dark", toggle };
}

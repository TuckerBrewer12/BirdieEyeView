import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { isThemePreference, resolveTheme, type ThemePreference } from "@/domain/theme";
import { THEME_STORAGE_KEY, ThemeContext, type ThemeValue } from "./theme";

/** Keys from before there was one preference; read once so nobody loses their choice. */
const LEGACY_KEYS = ["settings_theme", "public_theme"];

const DARK_QUERY = "(prefers-color-scheme: dark)";

function readPreference(): ThemePreference {
  try {
    for (const key of [THEME_STORAGE_KEY, ...LEGACY_KEYS]) {
      const value = localStorage.getItem(key);
      if (isThemePreference(value)) return value;
    }
  } catch {
    // Storage can be blocked; fall through to the device.
  }
  return "system";
}

function savePreference(preference: ThemePreference): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, preference);
    for (const key of LEGACY_KEYS) localStorage.removeItem(key);
  } catch {
    // The theme still applies for this visit.
  }
}

function deviceIsDark(): boolean {
  return window.matchMedia?.(DARK_QUERY).matches ?? false;
}

/**
 * The one owner of the theme. It saves the preference, puts `dark` on <html>, and follows the device
 * while the preference is "system". Components read it through `useTheme` only to change the theme.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(readPreference);
  const [deviceDark, setDeviceDark] = useState(deviceIsDark);
  const resolved = resolveTheme(preference, deviceDark);

  useEffect(() => {
    const query = window.matchMedia?.(DARK_QUERY);
    if (!query) return;
    const onChange = (event: MediaQueryListEvent) => setDeviceDark(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", resolved === "dark");
  }, [resolved]);

  const setPreference = useCallback((next: ThemePreference) => {
    savePreference(next);
    setPreferenceState(next);
  }, []);

  const value = useMemo<ThemeValue>(
    () => ({
      preference,
      resolved,
      setPreference,
      toggle: () => setPreference(resolved === "dark" ? "light" : "dark"),
    }),
    [preference, resolved, setPreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

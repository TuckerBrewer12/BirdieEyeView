/** What the player chose. "system" follows the device's light or dark setting. */
export type ThemePreference = "light" | "dark" | "system";

/** The theme actually showing. */
export type ResolvedTheme = "light" | "dark";

export const THEME_PREFERENCES: readonly ThemePreference[] = ["light", "dark", "system"];

export function isThemePreference(value: unknown): value is ThemePreference {
  return typeof value === "string" && (THEME_PREFERENCES as readonly string[]).includes(value);
}

export function resolveTheme(preference: ThemePreference, deviceIsDark: boolean): ResolvedTheme {
  if (preference === "system") return deviceIsDark ? "dark" : "light";
  return preference;
}

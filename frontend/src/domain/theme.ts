export type ThemePreference = "light" | "dark" | "system";

export type ResolvedTheme = "light" | "dark";

const THEME_PREFERENCES: readonly ThemePreference[] = ["light", "dark", "system"];

export function isThemePreference(value: unknown): value is ThemePreference {
  return typeof value === "string" && (THEME_PREFERENCES as readonly string[]).includes(value);
}

export function resolveTheme(preference: ThemePreference, deviceIsDark: boolean): ResolvedTheme {
  if (preference === "system") return deviceIsDark ? "dark" : "light";
  return preference;
}

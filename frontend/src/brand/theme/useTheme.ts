import { useSyncExternalStore } from "react";
import { colors } from "./colors";

export type ColorMode = "light" | "dark";
export type ColorScheme = { [K in keyof typeof colors.light]: string };

export type BrandTheme = ColorScheme & {
  mode: ColorMode;
  isDark: boolean;
  primary: string;
  onPrimary: string;
  score: typeof colors.score;
};

function getMode(): ColorMode {
  if (typeof document === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

const listeners = new Set<() => void>();
let observing = false;

function ensureObserver() {
  if (observing || typeof MutationObserver === "undefined" || typeof document === "undefined") return;
  observing = true;
  new MutationObserver(() => {
    listeners.forEach((listener) => listener());
  }).observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
}

function subscribe(onChange: () => void) {
  ensureObserver();
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

export function useTheme(): BrandTheme {
  const mode = useSyncExternalStore(subscribe, getMode, () => "light" as const);
  const scheme = colors[mode];
  return {
    mode,
    isDark: mode === "dark",
    primary: colors.primary,
    onPrimary: colors.onPrimary,
    score: colors.score,
    ...scheme,
  };
}

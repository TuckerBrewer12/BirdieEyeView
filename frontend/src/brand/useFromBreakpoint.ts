import { useSyncExternalStore } from "react";
import { fromBreakpoint } from "./theme/breakpoints";
import type { breakpoints } from "./theme/tokens";

/**
 * Whether the screen is at least as wide as the breakpoint, as Tailwind's prefix of the same name
 * reads it, kept up as the window resizes. For what a class can't switch: a sheet's side.
 */
export function useFromBreakpoint(name: keyof typeof breakpoints): boolean {
  const query = fromBreakpoint(name);
  // A window with no media queries (a unit test's) reads as narrow, as a server render does.
  const media = typeof window.matchMedia === "function";
  return useSyncExternalStore(
    (onChange) => {
      if (!media) return () => {};
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => media && window.matchMedia(query).matches,
    () => false,
  );
}

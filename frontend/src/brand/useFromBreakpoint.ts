import { useSyncExternalStore } from "react";
import { fromBreakpoint } from "./theme/breakpoints";
import type { breakpoints } from "./theme/tokens";

export function useFromBreakpoint(name: keyof typeof breakpoints): boolean {
  const query = fromBreakpoint(name);
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

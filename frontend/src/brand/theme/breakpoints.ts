import { breakpoints } from "./tokens";

/**
 * A media query that matches from the breakpoint up, as Tailwind's prefix of the same name does,
 * for places that can't take a class, like a `<source media>`.
 */
export function fromBreakpoint(name: keyof typeof breakpoints): string {
  return `(min-width: ${breakpoints[name]}rem)`;
}

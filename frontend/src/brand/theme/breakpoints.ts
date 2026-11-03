/**
 * Viewport widths, in rem, for places that can't read a CSS variable, like a `<source media>`
 * query. rem rather than px, so a query switches where Tailwind's `sm:` classes do even when the
 * browser's default text size isn't 16px. tokens.css pins the same widths; tokens.test keeps them equal.
 */
export const breakpoints = { sm: 40 } as const;

export function fromBreakpoint(name: keyof typeof breakpoints): string {
  return `(min-width: ${breakpoints[name]}rem)`;
}

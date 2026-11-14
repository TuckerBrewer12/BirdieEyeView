import { breakpoints } from "./tokens";

export function fromBreakpoint(name: keyof typeof breakpoints): string {
  return `(min-width: ${breakpoints[name]}rem)`;
}

import type { ColorName } from "./tokens";

/**
 * A colour token as a string, for a prop that only takes one: Recharts' `fill`,
 * `stroke` and `tick`, a gradient `<stop>`, an inline tooltip style.
 *
 *     <ReferenceLine stroke={color("chart-muted")} />
 *
 * Markup and our own SVG use the Tailwind utility instead (`stroke-chart-muted`).
 * It is a `var()` reference, so it follows the colour mode; anything that
 * parses it as a colour (canvas) has to resolve it against the document first.
 */
export function color(name: ColorName): string {
  return `var(--${name})`;
}

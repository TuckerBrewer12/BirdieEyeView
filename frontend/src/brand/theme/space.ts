/**
 * Space, size, radius, and related measures, as references to the tokens.
 *
 * The values themselves live once, in `tokens.css`. These are `var()` strings
 * so they resolve in CSS with no React involvement. In ordinary markup prefer
 * the Tailwind utility — `rounded-card` over `style={{ borderRadius: radius.card }}`.
 * Reach for this when a library takes a style object.
 *
 * `tokens.test.ts` fails if a name here has no definition in tokens.css.
 */
export const space = {
  bar: "var(--brand-space-bar)",
  hair: "var(--brand-space-hair)",
  chip: "var(--brand-space-chip)",
  dot: "var(--brand-space-dot)",
  tight: "var(--brand-space-tight)",
  addon: "var(--brand-space-addon)",
  addonKbd: "var(--brand-space-addon-kbd)",
  nudge: "var(--brand-space-nudge)",
  nudgeSm: "var(--brand-space-nudge-sm)",
} as const;

export const size = {
  dateRail: "var(--brand-size-date-rail)",
  preview: "var(--brand-size-preview)",
  chart: "var(--brand-size-chart)",
  sheet: "var(--brand-size-sheet)",
  iconXs: "var(--brand-size-icon-xs)",
  holeW: "var(--brand-size-hole-w)",
  holeH: "var(--brand-size-hole-h)",
} as const;

export const radius = {
  sm: "var(--brand-radius-sm)",
  md: "var(--brand-radius-md)",
  lg: "var(--brand-radius-lg)",
  xl: "var(--brand-radius-xl)",
  bar: "var(--brand-radius-bar)",
  tick: "var(--brand-radius-tick)",
  card: "var(--brand-radius-card)",
  tooltip: "var(--brand-radius-tooltip)",
  addon: "var(--brand-radius-addon)",
  control: "var(--brand-radius-control)",
} as const;

export const borderWidth = "var(--brand-border-width)";
export const ringWidth = "var(--brand-ring-width)";
export const opacityRecessed = "var(--brand-opacity-recessed)";

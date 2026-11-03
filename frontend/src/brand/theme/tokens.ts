/**
 * Every design value in the app, and the only place one is written down.
 *
 * `npm run gen:tokens` turns this file into `tokens.gen.css`: the colours as
 * custom properties on `:root` and `:root.dark`, the measures as `--brand-*`
 * properties, and the `@theme inline` block that gives each one its Tailwind
 * utility (`bg-card`, `text-caption`, `rounded-tooltip`, `h-chart`, …).
 * Markup uses those utilities. TypeScript reads the numbers here directly
 * (chart geometry, motion), and reaches a colour for a string prop through
 * `color()`. Plain data, no React or DOM, so a native app can read it too.
 *
 * A bare number is pixels, except in `leading`, `stroke` and `breakpoints`,
 * which say otherwise. A string is written to the CSS as it is.
 */

/** A colour: a CSS colour, another token's value, or a mix of two tokens. */
export type ColorValue = string | { alias: string } | { mix: [string, string, number] };

/** This token is the same colour as `name`, and follows it in both modes. */
const alias = (name: string) => ({ alias: name });

/** `percent` of `over` mixed into `base`, in oklch. Both follow the mode. */
const mix = (base: string, over: string, percent: number) => ({ mix: [base, over, percent] as [string, string, number] });

const light = {
  background: "#f8faf8",
  foreground: "#1a2e1a",
  card: "#ffffff",
  // Ink on a card, an accent wash or the secondary fill is the page's ink.
  "card-foreground": alias("foreground"),
  muted: "#f4f6f0",
  "muted-foreground": "#6b7765",
  border: "#e4e9e1",
  // A field's outline is the ordinary border.
  input: alias("border"),
  ring: "#2d7a3a",
  primary: "#2d7a3a",
  "primary-foreground": "#ffffff",
  secondary: "#f4f6f0",
  "secondary-foreground": alias("foreground"),
  // The secondary fill under the pointer: a touch of ink mixed in.
  "secondary-hover": mix("secondary", "foreground", 5),
  accent: "#e8f5e9",
  "accent-foreground": alias("foreground"),
  destructive: "#dc2626",
  // Ambient shadow for lifted surfaces; alpha so it reads on any backdrop.
  shadow: "rgb(15 23 42 / 0.10)",

  // Chart chrome. Data colours are the score tokens; these are the furniture
  // around them. On a light page the axis is the par grey.
  "chart-axis": alias("score-par-base"),
  "chart-muted": "#e5e7eb",
  "chart-accent": "#4ade80",

  // The app's side rail: the brand's own surface, the same in both modes.
  sidebar: "#1e3d25",
  "sidebar-end": "#152d1b",
  "sidebar-foreground": "#ffffff",

  // Score colours encode data, so they do not flip with the mode. `base` is
  // the saturated fill, `muted` the wash behind a score, `on-*` the ink on
  // each, and `text` (the `text-score-<kind>` utility) the ink on the page.
  "score-eagle-base": "#f59e0b",
  "score-eagle-muted": "#fef3c7",
  "score-eagle-on-base": "#ffffff",
  "score-eagle-on-muted": "#92400e",
  "score-eagle-text": alias("score-eagle-base"),
  "score-birdie-base": "#059669",
  "score-birdie-muted": "#d1fae5",
  "score-birdie-on-base": "#ffffff",
  "score-birdie-on-muted": "#065f46",
  "score-birdie-text": alias("score-birdie-base"),
  "score-par-base": "#9ca3af",
  "score-par-muted": "#f3f4f6",
  "score-par-on-base": "#ffffff",
  "score-par-on-muted": "#374151",
  "score-par-text": alias("score-par-base"),
  "score-bogey-base": "#f87171",
  "score-bogey-muted": "#fee2e2",
  "score-bogey-on-base": "#ffffff",
  "score-bogey-on-muted": "#991b1b",
  "score-bogey-text": alias("score-bogey-base"),
  "score-double-base": "#60a5fa",
  "score-double-muted": "#dbeafe",
  "score-double-on-base": "#ffffff",
  "score-double-on-muted": "#1e40af",
  "score-double-text": alias("score-double-base"),
  "score-triple-base": "#a78bfa",
  "score-triple-muted": "#ede9fe",
  "score-triple-on-base": "#ffffff",
  "score-triple-on-muted": "#5b21b6",
  "score-triple-text": alias("score-triple-base"),
  "score-quad-base": "#6d28d9",
  "score-quad-muted": "#ddd6fe",
  "score-quad-on-base": "#ffffff",
  "score-quad-on-muted": "#4c1d95",
  "score-quad-text": alias("score-quad-base"),

  // Scorecard rows. The layout picker's chips and the landing hero's demo of
  // it share one set. Fixed like the score colours: they label rows.
  "scan-row-name": "#475569",
  "scan-row-score": alias("primary"),
  "scan-row-putts": "#0369a1",
  "scan-row-shots": alias("score-quad-base"),
  "demo-card-header": "#2d4c3b",

  // Tee boxes. A tee's colour names a real marker on the course, so these do
  // not flip with the mode. `on` is the ink that reads on the swatch.
  "tee-black": "#1f2421",
  "tee-black-on": "#ffffff",
  "tee-white": "#ffffff",
  "tee-white-on": "#1a2e1a",
  "tee-blue": "#2563eb",
  "tee-blue-on": "#ffffff",
  "tee-gold": "#c9a227",
  "tee-gold-on": "#1a2e1a",
  "tee-yellow": "#facc15",
  "tee-yellow-on": "#1a2e1a",
  "tee-red": "#dc2626",
  "tee-red-on": "#ffffff",
  "tee-green": "#2d7a3a",
  "tee-green-on": "#ffffff",
  "tee-silver": "#c0c6cc",
  "tee-silver-on": "#1a2e1a",
  "tee-orange": "#f97316",
  "tee-orange-on": "#ffffff",
  "tee-purple": "#7c3aed",
  "tee-purple-on": "#ffffff",
  "tee-brown": "#8b5a2b",
  "tee-brown-on": "#ffffff",
} satisfies Record<string, ColorValue>;

/** A colour token's name, which is also its CSS custom property: `card` is `--card`. */
export type ColorName = keyof typeof light;

/**
 * The palette in each mode. Dark has every light key; it changes the surfaces
 * and ink, and keeps the brand green, the sidebar and the data colours.
 */
export const colors: Record<"light" | "dark", Record<ColorName, ColorValue>> = {
  light,
  dark: {
    ...light,
    background: "#111213",
    foreground: "#e6edf3",
    card: "#18191a",
    muted: "#222426",
    "muted-foreground": "#9aa4b2",
    border: "#2a2d30",
    ring: "#34d399",
    secondary: "#222426",
    accent: "#1a3a1f",
    destructive: "#f87171",
    // Black reads as nothing on a dark page, so lift with a stronger halo.
    shadow: "rgb(0 0 0 / 0.55)",
    "chart-axis": "#6b7280",
    "chart-muted": "#2a2d30",
  },
};

export const font = {
  sans: '"DM Sans", system-ui, sans-serif',
  mono: '"DM Mono", monospace',
};

/** Type roles, not pixel sizes: components use `text-caption`, never a raw size. */
export const text = {
  caption: 9,
  meta: 10,
  label: 11,
  "body-sm": 12,
  body: 13,
  "button-sm": "0.8rem",
  title: 26,
  hero: 44,
};

/** Line heights, unitless. */
export const leading = {
  display: 1.1,
};

export const tracking = {
  name: -0.3,
  title: -0.5,
  display: -0.6,
  stat: -0.8,
  hero: -1.8,
  chip: 0.5,
  kicker: 1,
  net: 1.2,
  eyebrow: 1.4,
  section: "0.18em",
};

/** Space that is not on Tailwind's 4px scale. */
export const space = {
  bar: 1.5,
  hair: 2.5,
  chip: 3,
  dot: 3,
  tight: 5,
  /** What a control's corner gives up inside its group, so the corners nest. */
  nudge: 5,
  "nudge-sm": 3,
  addon: "0.3rem",
  "addon-kbd": "0.15rem",
  /** The phone's home-indicator strip, which a bar pinned to the bottom pads past. */
  "safe-bottom": "env(safe-area-inset-bottom, 0px)",
};

/** Shadcn's base radius, `--radius`; the named steps below sit around it. */
export const radiusBase = "0.5rem";

export const radius = {
  sm: "0.25rem",
  md: "0.375rem",
  lg: "0.5rem",
  xl: "0.75rem",
  bar: 1.5,
  tick: 2,
  card: 10,
  tooltip: 12,
  addon: "calc(var(--radius) - var(--brand-space-nudge))",
  control: "calc(var(--radius) - var(--brand-space-nudge-sm))",
};

/** Widths and heights that are not on the 4px scale. */
export const size = {
  "date-rail": 54,
  preview: 390,
  chart: 180,
  "chart-compact": 210,
  /** Width a hole-by-hole chart needs before it scrolls sideways. */
  "chart-wide": "45rem",
  sheet: "28rem",
  /** Widest a target of results grows. */
  target: "15rem",
  "icon-xs": 11,
  "hole-w": 30,
  "hole-h": 22,
  // A profile bar's height in its row, by score: the worse the hole, the taller.
  "profile-eagle": "28%",
  "profile-birdie": "40%",
  "profile-par": "52%",
  "profile-bogey": "72%",
  "profile-double": "92%",
  "profile-worse": "100%",
  /** Width a full scorecard needs before it scrolls sideways. */
  scorecard: "43.75rem",
};

/** Line widths, in pixels. */
export const lineWidth = {
  border: 1,
  ring: 3,
};

/** Icon line weight in the tab bar, unitless: lighter at rest, heavier on the current tab. */
export const stroke = {
  icon: 1.75,
  "icon-active": 2.25,
};

export const opacity = {
  recessed: "35%",
  /** Soft fill under a line or inside a shape. */
  wash: "22%",
};

/** Shadows follow `--shadow`, so they deepen in dark mode. sm/md/lg keep Tailwind's geometry. */
export const shadow = {
  card: "0 6px 20px var(--shadow)",
  hairline: "0 1px 0 var(--shadow)",
  sm: "0 1px 3px 0 var(--shadow), 0 1px 2px -1px var(--shadow)",
  md: "0 4px 6px -1px var(--shadow), 0 2px 4px -2px var(--shadow)",
  lg: "0 10px 15px -3px var(--shadow), 0 4px 6px -4px var(--shadow)",
};

/** Named grid column templates: `grid-cols-round-preview`. */
export const gridColumns = {
  "round-preview": "var(--brand-size-date-rail) 1fr auto",
  "handicap-breakdown": "1fr auto auto auto",
  "recent-rounds": "1fr auto auto",
};

/**
 * Viewport widths, in rem, so a query switches where Tailwind's `sm:` does even
 * when the browser's default text size isn't 16px. `sm` is Tailwind's own.
 */
export const breakpoints = {
  sm: 40,
};

type Ease = [number, number, number, number];

/** Framer Motion's numbers. Hover and press scale on a spring, everything else on a duration. */
export const motion = {
  hoverScale: 1.015,
  tapScale: 0.98,
  spring: { type: "spring" as const, stiffness: 400, damping: 30 },
  duration: { collapse: 0.2 },
  /** A chart line drawing itself in. */
  draw: { duration: 1.4, ease: "easeInOut" as const },
  /** Points popping in along a drawn line, one after another, once it has nearly finished. */
  pop: { from: 0, delay: 1.2, stagger: 0.04, duration: 0.25, ease: "backOut" as const },
  /** Content arriving on load: a fast start and a long settle. */
  entrance: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as Ease },
  /** A block resizing into the space it has been given. */
  layout: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as Ease },
};

/** A length from above in pixels, for a chart that only takes numbers. Assumes 16px to the rem. */
function px(length: number | string): number {
  if (typeof length === "number") return length;
  const rem = /^(-?[\d.]+)rem$/.exec(length);
  if (!rem) throw new Error(`${length} is not a pixel or rem length`);
  return Number(rem[1]) * 16;
}

type Corners = [number, number, number, number];

/**
 * Chart geometry. Recharts and our SVG plots take numbers, so they read these.
 * SVG plots are unitless and scale to their container, keeping this shape.
 */
export const chart = {
  barRadius: [px(radius.md), px(radius.md), 0, 0] as Corners,
  /** Rounded outer ends of a horizontal stacked bar. */
  stackEndRadius: {
    left: [px(radius.sm), 0, 0, px(radius.sm)] as Corners,
    right: [0, px(radius.sm), px(radius.sm), 0] as Corners,
  },
  margin: { top: 4, right: 8, left: -20, bottom: 0 },
  /** Widest a Recharts bar grows when there are few of them. */
  barMaxWidth: 28,
  /** A full ring sized to fill the chart height. */
  ring: { inner: 50, outer: 68 },
  /** A half gauge drawn up from the bottom edge of its box. */
  gauge: { inner: 52, outer: 72 },
  plot: {
    width: 560,
    height: size.chart,
    pad: { top: 12, right: 64, bottom: 20, left: 52 },
    barMin: 4,
    barMax: 14,
    barGap: 2,
    dot: 3.5,
    dotHover: 6,
  },
  /** The same plot on a phone: narrower and taller, one series at a time, so no right-hand axis. */
  plotCompact: {
    width: 320,
    height: size["chart-compact"],
    pad: { top: 16, right: 16, bottom: 32, left: 44 },
  },
  /** A figure's trend line. */
  sparkline: {
    width: 300,
    height: 56,
    pad: space.tight,
    stroke: 2,
    dot: space.dot,
  },
  /** A golfer's scores over time, one dot per round. */
  trend: {
    width: 560,
    height: size.chart,
    pad: { top: 16, right: 16, bottom: 28, left: 36 },
    /** Room either side of the lowest and highest score, in strokes. */
    headroom: 3,
    dot: 4,
    dotHover: 6,
    /** Past this many rounds the date ticks would crowd, so they are left off. */
    maxTicks: 12,
  },
  /** A shape across a handful of measures, each axis 0–100 from the centre out. Labels sit past the rim. */
  radar: {
    width: 560,
    height: 340,
    radius: 118,
    /** From the rim to an axis label, and from the label down to its figures. */
    labelGap: 18,
    valueGap: 16,
    /** Rings drawn at these shares of the rim, in percent. */
    rings: [25, 50, 75, 100],
    dot: 4,
    stroke: 2,
  },
  /** The same shape on a phone: a narrower drawing, so its labels stay readable at a phone's width. */
  radarCompact: {
    width: 360,
    height: 300,
    radius: 72,
    labelGap: 16,
    valueGap: 16,
  },
  /** Scores against a goal: a short strip of dots, lower scores higher up, the goal dashed across. */
  goal: {
    width: 560,
    height: 96,
    pad: { x: 8, y: 14 },
    /** Room at the right end of the goal line for its label. */
    labelRoom: 32,
    dot: 4,
    dotReached: 5.5,
  },
  /** One figure per round over a soft fill, with a second line beside it if wanted. */
  trendArea: {
    width: 560,
    height: size.chart,
    pad: { top: 12, right: 16, bottom: 24, left: 40 },
    /** Share of the span left either side of the values, so the line never touches the edge. */
    headroom: 0.15,
    stroke: 2,
    /** The second line is thinner, so the first reads as the figure. */
    strokeSecondary: 1.5,
    dot: 3,
    dotHover: 5,
    /** Past this many rounds the dots would crowd the line, so only the hovered one is drawn. */
    maxDots: 30,
    /** About this many round numbers along the bottom. */
    xTicks: 6,
    yTicks: 4,
  },
  /** Holes as dots on a target, the better the score the nearer the middle. It fills `max-w-target`. */
  target: {
    size: 200,
    /** Each score kind's ring, as a share of the radius from the middle out. Quads share the triple ring. */
    rings: { eagle: 0.18, birdie: 0.35, par: 0.55, bogey: 0.7, double: 0.83, triple: 1 },
    stroke: 1.5,
    dot: 3.5,
    dotHover: 5,
    /** How near the pointer has to be to a dot, in the chart's units, to pick it. */
    hitRadius: 10,
  },
  /** A round hole by hole, as wide as `w-chart-wide`, which it scrolls at. */
  flow: {
    width: px(size["chart-wide"]),
    height: 220,
    pad: { top: 28, right: 16, bottom: 36, left: 40 },
    /** To-par beyond this is drawn at the edge, so one blow-up hole cannot flatten the rest. */
    extent: 5,
    dot: 4,
    dotHover: 6,
  },
};

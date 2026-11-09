/**
 * Every design value in the app, and the only place one is written down.
 *
 * Colours come in two layers. `palette` holds the raw colours, named by hue and
 * step; nothing else in the app writes a colour value. `modes.light` and
 * `modes.dark` then say what each colour is *for*: every key maps onto a
 * palette colour, another key (`alias`), or a mix of two keys. Dark mode is
 * the same keys mapped a second time.
 *
 * `npm run gen:tokens` turns this file into `tokens.gen.css`: the semantic
 * colours as custom properties on `:root` and `:root.dark`, the measures as
 * `--brand-*` properties, and the `@theme inline` block that gives each one its
 * Tailwind utility (`bg-card`, `text-caption`, `rounded-tooltip`, `h-chart`, …).
 *
 * In TypeScript, read everything as `tokens.*`. `tokens.color` is the semantic
 * colours as `var()` references (`tokens.color.score.birdie.base` is
 * `"var(--score-birdie-base)"`), so dark mode still switches in CSS; the
 * numbers (`tokens.chart`, `tokens.motion`, `tokens.space`) are real values.
 * Plain data, no React or DOM, so a native app can read it too.
 *
 * A bare number is pixels, except in `leading`, `stroke`, `opacity` and `breakpoints`,
 * which say otherwise. A string is written to the CSS as it is.
 */

/**
 * The raw colours. Hues take Tailwind's step numbers where the colour is
 * Tailwind's. The brand's own: `sage` the neutrals of the light page,
 * `charcoal` those of the dark one, `fairway` the brand greens, `forest` the
 * side rail's deeper greens, `denim` the blue that sits beside them.
 */
export const palette = {
  white: "#ffffff",
  black: "#000000",
  sage: {
    25: "#f3f4ef",
    50: "#f5f6f3",
    100: "#eef0ec",
    150: "#eceee9",
    200: "#e2e5df",
    300: "#c9cec5",
    400: "#9aa39d",
    500: "#69756d",
    600: "#4b5750",
    800: "#1e2b24",
    900: "#15201a",
  },
  charcoal: {
    50: "#e9eeea",
    200: "#b3bdb6",
    400: "#8e9992",
    700: "#3b443e",
    800: "#2a312c",
    850: "#1e2420",
    900: "#161b18",
    950: "#0e1210",
  },
  fairway: {
    50: "#eaf3ec",
    300: "#74c98e",
    400: "#5dbb7b",
    700: "#1f6e3c",
    800: "#175a30",
    900: "#17291d",
    950: "#08130c",
  },
  forest: { 700: "#2d7a3a", 750: "#2d4c3b", 800: "#1e3d25" },
  denim: { 500: "#3d6fb6", 700: "#2457a6" },
  gray: { 100: "#f3f4f6", 200: "#e5e7eb", 600: "#4b5563", 700: "#374151" },
  slate: { 600: "#475569", 900: "#0f172a" },
  red: { 100: "#fee2e2", 400: "#f87171", 600: "#dc2626", 700: "#b91c1c", 800: "#991b1b" },
  orange: { 500: "#f97316" },
  amber: { 100: "#fef3c7", 400: "#fbbf24", 800: "#92400e" },
  yellow: { 400: "#facc15", 700: "#a16207" },
  gold: { 600: "#c9a227" },
  brown: { 600: "#8b5a2b" },
  green: { 400: "#4ade80" },
  emerald: { 100: "#d1fae5", 400: "#34d399", 700: "#047857", 800: "#065f46" },
  sky: { 700: "#0369a1" },
  blue: { 100: "#dbeafe", 400: "#60a5fa", 600: "#2563eb", 800: "#1e40af" },
  violet: { 100: "#ede9fe", 200: "#ddd6fe", 600: "#7c3aed", 800: "#5b21b6", 900: "#4c1d95" },
  silver: { 300: "#c0c6cc" },
} as const;

const {
  white,
  black,
  sage,
  charcoal,
  fairway,
  forest,
  denim,
  gray,
  slate,
  red,
  orange,
  amber,
  yellow,
  gold,
  brown,
  green,
  emerald,
  sky,
  blue,
  violet,
  silver,
} = palette;

/** Another semantic colour, by its CSS name: this key follows it in both modes. */
export interface Alias {
  alias: string;
}
/** `percent` of `over` mixed into `base` (CSS names), in oklch. */
export interface Mix {
  mix: [base: string, over: string, percent: number];
}
/** A palette colour at an opacity. */
export interface Alpha {
  alpha: [color: string, opacity: number];
}
/** What a semantic colour maps onto: a palette colour, another key, a mix, or a palette colour at an opacity. */
export type ColorValue = string | Alias | Mix | Alpha;

/**
 * Semantic colours, nested. A key's CSS name is its path in kebab case, so
 * `score.birdie.onBase` is `--score-birdie-on-base`; a `DEFAULT` key is the
 * group's own name (`sidebar.DEFAULT` is `--sidebar`).
 */
export interface ColorTree {
  [key: string]: ColorValue | ColorTree;
}

const alias = (name: string): Alias => ({ alias: name });
const mix = (base: string, over: string, percent: number): Mix => ({ mix: [base, over, percent] });
const alpha = (color: string, opacity: number): Alpha => ({ alpha: [color, opacity] });

/**
 * A score kind's colours. `text`, the ink on the page, is the fill colour
 * itself, unless the fill is too pale to read as ink (par).
 */
const score = (
  kind: string,
  base: string,
  muted: string,
  onMuted: string,
  { onBase = white, text = alias(`score-${kind}-base`) }: { onBase?: string; text?: ColorValue } = {},
) => ({ base, muted, onBase, onMuted, text });

/** A status's colours: `base` the solid fill, `onBase` the ink on it, `text` its ink (and outline) on a card. */
const status = (kind: string, base: string, text: ColorValue = alias(`status-${kind}-base`)) => ({
  base,
  onBase: white,
  text,
});

const light = {
  // The soft surface: a warm page, ink a step off black, cards lifted by shadow rather than ruled.
  background: sage[25],
  foreground: sage[800],
  // Labels and body copy one step back from the page's ink.
  foregroundSecondary: sage[600],
  card: white,
  // Ink on a card, an accent wash or the secondary fill is the page's ink.
  cardForeground: alias("foreground"),
  muted: sage[100],
  mutedForeground: sage[500],
  border: sage[200],
  // The outline of something you act on: a field, a secondary button.
  borderStrong: sage[300],
  input: alias("border-strong"),
  ring: alias("primary"),
  primary: fairway[700],
  primaryHover: fairway[800],
  primaryForeground: white,
  secondary: alias("muted"),
  secondaryForeground: alias("foreground"),
  // The secondary fill under the pointer: a touch of ink mixed in.
  secondaryHover: mix("secondary", "foreground", 5),
  accent: fairway[50],
  accentForeground: alias("foreground"),
  destructive: red[700],
  destructiveHover: red[800],
  // Ambient shadow for lifted surfaces; alpha so it reads on any backdrop.
  shadow: alpha(slate[900], 0.1),
  // A card's two-layer lift: a tight contact shadow and a wide, faint spread.
  surfaceShadow: { near: alpha(sage[900], 0.04), far: alpha(sage[900], 0.06) },

  // Alerts and badges. Solid: `bg-status-info-base text-status-info-on-base`;
  // outline: `border-status-info text-status-info` on a card.
  status: {
    info: status("info", denim[700]),
    success: status("success", emerald[700]),
    warning: status("warning", yellow[700]),
    danger: status("danger", red[700]),
  },

  // Chart chrome. Data colours are the score colours; these are the furniture
  // around them, plus two series for charts that compare lines.
  chart: {
    series1: alias("primary"),
    series2: denim[500],
    grid: sage[150],
    reference: sage[400],
    axis: alias("chart-reference"),
    muted: gray[200],
    accent: green[400],
  },

  // The app's side rail: the brand's own surface, the same in both modes.
  sidebar: {
    DEFAULT: forest[800],
    foreground: white,
  },

  // Score colours encode data, so they do not flip with the mode. `base` is
  // the saturated fill, `muted` the wash behind a score, `on*` the ink on each.
  // White on every fill but par passes 4.5:1, and the scale darkens past bogey.
  score: {
    eagle: score("eagle", yellow[700], amber[100], amber[800]),
    birdie: score("birdie", emerald[700], emerald[100], emerald[800]),
    par: score("par", gray[200], gray[100], gray[700], { onBase: gray[600], text: gray[600] }),
    bogey: score("bogey", red[600], red[100], red[800]),
    double: score("double", blue[600], blue[100], blue[800]),
    triple: score("triple", violet[600], violet[100], violet[800]),
    quad: score("quad", violet[900], violet[200], violet[900]),
  },

  // Scorecard rows. The layout picker's chips and the landing hero's demo of
  // it share one set. Fixed like the score colours: they label rows.
  scanRow: {
    name: slate[600],
    score: alias("primary"),
    putts: sky[700],
    shots: alias("score-quad-base"),
  },
  demoCardHeader: forest[750],

  // Tee boxes. A tee's colour names a real marker on the course, so these do
  // not flip with the mode. `on` is the ink that reads on the swatch.
  tee: {
    black: { DEFAULT: sage[900], on: white },
    white: { DEFAULT: white, on: sage[900] },
    blue: { DEFAULT: blue[600], on: white },
    gold: { DEFAULT: gold[600], on: sage[900] },
    yellow: { DEFAULT: yellow[400], on: sage[900] },
    red: { DEFAULT: red[600], on: white },
    green: { DEFAULT: forest[700], on: white },
    silver: { DEFAULT: silver[300], on: sage[900] },
    orange: { DEFAULT: orange[500], on: white },
    purple: { DEFAULT: violet[600], on: white },
    brown: { DEFAULT: brown[600], on: white },
  },
} satisfies ColorTree;

type DeepPartial<T> = { [K in keyof T]?: T[K] extends ColorValue ? ColorValue : DeepPartial<T[K]> };

function override<T extends ColorTree>(base: T, changes: DeepPartial<T>): T {
  const out: ColorTree = { ...base };
  for (const [key, value] of Object.entries(changes) as [string, ColorValue | ColorTree][]) {
    const current = base[key];
    out[key] = isColorValue(value) || isColorValue(current) ? value : override(current, value as DeepPartial<ColorTree>);
  }
  return out as T;
}

/** A leaf of a colour tree, as opposed to a group of them. */
export function isColorValue(value: ColorValue | ColorTree): value is ColorValue {
  return typeof value === "string" || "alias" in value || "mix" in value || "alpha" in value;
}

/**
 * The semantic colours in each mode. Dark changes the surfaces, the ink and
 * the brand green, and keeps the sidebar and the data colours.
 */
export const modes = {
  light,
  dark: override(light, {
    background: charcoal[950],
    foreground: charcoal[50],
    foregroundSecondary: charcoal[200],
    card: charcoal[900],
    muted: charcoal[850],
    mutedForeground: charcoal[400],
    border: charcoal[800],
    borderStrong: charcoal[700],
    primary: fairway[400],
    primaryHover: fairway[300],
    primaryForeground: fairway[950],
    accent: fairway[900],
    destructive: red[600],
    destructiveHover: red[700],
    // Black reads as nothing on a dark page, so lift with a stronger halo.
    shadow: alpha(black, 0.55),
    surfaceShadow: { near: alpha(black, 0.3), far: alpha(black, 0.35) },
    // The fills stay; the ink on a dark card is a lighter step of each.
    status: {
      info: { text: blue[400] },
      success: { text: emerald[400] },
      warning: { text: amber[400] },
      danger: { text: red[400] },
    },
    chart: { series2: blue[400], grid: charcoal[850], reference: charcoal[400], muted: charcoal[700] },
  }),
};

/** `score.birdie.onBase` → `score-birdie-on-base`; a `DEFAULT` key drops out. */
export function cssName(path: string[]): string {
  return path
    .filter((key) => key !== "DEFAULT")
    .map((key) => key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`))
    .join("-");
}

/** The colour tree's shape with a `var()` string at every leaf. */
export type ColorRefs<T> = { readonly [K in keyof T]: T[K] extends ColorValue ? string : ColorRefs<T[K]> };

function refs<T extends ColorTree>(tree: T, path: string[] = []): ColorRefs<T> {
  return Object.fromEntries(
    Object.entries(tree).map(([key, value]) => [
      key,
      isColorValue(value) ? `var(--${cssName([...path, key])})` : refs(value, [...path, key]),
    ]),
  ) as ColorRefs<T>;
}

/**
 * Every semantic colour as a `var()` reference, for SVG paint and chart-library
 * props: `stroke={tokens.color.border}`, `fill={tokens.color.score[kind].base}`.
 * HTML elements use the Tailwind utility (`bg-card`) instead. These are
 * references, not colours, so they follow the mode; something that parses the
 * string as a colour (canvas) has to resolve it with `getComputedStyle` first.
 */
export const color = refs(light);

export const font = {
  sans: '"DM Sans", system-ui, sans-serif',
  mono: '"DM Mono", monospace',
};

/** Line heights, unitless. */
export const leading = {
  display: 1.1,
  /** The last round's score sits tight on the line under it. */
  scoreboard: 0.9,
};

/**
 * Letter spacing, in pixels unless a string. The type roles below take theirs
 * from here; the rest are used beside a size of Tailwind's own (`text-2xl tracking-stat`).
 */
export const tracking = {
  name: -0.3,
  title: -0.5,
  display: -0.6,
  stat: -0.8,
  hero: -1.8,
  /** The last round's score: tight enough that two digits read as one mark. */
  scoreboard: -2.5,
  chip: 0.5,
  kicker: 1,
  eyebrow: 1.4,
  section: "0.18em",
};

/** A type role: a size in pixels, and the weight, tracking and line height that always go with it. */
export interface TypeRole {
  size: number;
  weight?: number;
  tracking?: number | string;
  /** Unitless. */
  leading?: number;
}

/**
 * Type roles, not pixel sizes: `text-eyebrow` sets the size, weight and
 * tracking of an eyebrow at once. A class beside it (`font-semibold`,
 * `tracking-chip`) still wins, for the odd place that differs. Uppercase is a
 * transform, not part of the type, so it stays a class (`text-eyebrow uppercase`).
 */
export const type = {
  /** Smallest print: chart axes, chips, the strokes on a hole. */
  caption: { size: 9 },
  /** Dates, counts, tab labels. */
  meta: { size: 10 },
  /** Field labels, chart ticks, secondary figures. */
  label: { size: 11 },
  /** Small body copy, tooltips, small buttons. */
  "body-sm": { size: 12 },
  body: { size: 13 },
  /** Large body copy: a list row's name, a large button's label, a field's value. */
  "body-lg": { size: 15 },
  /** A card's heading on the soft surface: "Earlier rounds", the goal on a phone. */
  subhead: { size: 17, weight: 600 },
  /** A page's title. */
  title: { size: 26, weight: 700, tracking: tracking.title },
  /** The dashboard's greeting: "Good evening, Tucker". */
  greeting: { size: 30, weight: 600, tracking: tracking.title },
  /** A card's lead figure on the soft surface: the scoring average, the best round. */
  figure: { size: 34, weight: 600, tracking: tracking.display },
  /** The same on a phone, and a phone's greeting. */
  "figure-sm": { size: 28, weight: 600, tracking: tracking.display },
  /** The last round's course on the dashboard. */
  name: { size: 22, weight: 600, tracking: tracking.name },
  /** The last round's score, the biggest number on the dashboard. */
  scoreboard: { size: 76, weight: 600, tracking: tracking.scoreboard, leading: leading.scoreboard },
  "scoreboard-sm": { size: 52, weight: 600, tracking: tracking.scoreboard, leading: leading.scoreboard },
  /** The one big figure on a card: a round's score. */
  hero: { size: 44, weight: 700, tracking: tracking.hero, leading: 1 },
  /** The tracked capitals above a figure or a group of rows. */
  eyebrow: { size: 10, weight: 700, tracking: tracking.eyebrow },
  /** A card's headline figure: a KPI tile's. */
  stat: { size: 32, weight: 700, tracking: tracking.stat, leading: leading.display },
  /** The smaller tracked capitals on a chip or a header strip. */
  kicker: { size: 9, weight: 700, tracking: tracking.kicker },
  /** The label above a page section (`SectionLabel`). */
  section: { size: 11, weight: 700, tracking: tracking.section },
} satisfies Record<string, TypeRole>;

/** Space that is not on Tailwind's 4px scale. */
export const space = {
  /** Between the bars of a hole-by-hole strip or profile. */
  bar: 1.5,
  /** Between a hole's number and the shape under it. */
  hair: 2.5,
  chip: 3,
  dot: 3,
  tight: 5,
  /** What a control's corner gives up inside its group, so the corners nest. */
  nudge: 5,
  "nudge-sm": 3,
  /** What a bar pinned to the bottom pads past: the phone's home-indicator strip, never less than 22px. */
  "safe-bottom": "max(env(safe-area-inset-bottom, 0px), 22px)",
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
  /** A card on the page: the soft surface's large corner. */
  surface: 22,
  /** The card a page leads with, a step rounder than the cards under it. */
  lead: 24,
  "lead-phone": 26,
  tooltip: 12,
  /** The top corners of a bottom sheet. */
  sheet: 20,
  addon: "calc(var(--radius) - var(--brand-space-nudge))",
  control: "calc(var(--radius) - var(--brand-space-nudge-sm))",
};

/** Widths and heights that are not on the 4px scale. */
export const size = {
  /** The side rail's width: `AppShell` sets it and clears the page past it. */
  rail: 240,
  preview: 390,
  chart: 180,
  "chart-compact": 210,
  /** Width a hole-by-hole chart needs before it scrolls sideways. */
  "chart-wide": "45rem",
  /** A side sheet's width. */
  sheet: 420,
  /** A bottom sheet that holds a table, not a list of options: the handicap breakdown. */
  "sheet-tall": 640,
  /** Widest a target of results grows. */
  target: "15rem",
  "icon-xs": 11,
  "icon-sm": 13,
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
  /** The card-coloured rim round a chart dot, so dots stand apart where they touch. */
  outline: 1.5,
};

/** Icon line weights, unitless: lighter at rest, heavier on a current item. */
export const stroke = {
  icon: 1.75,
  "icon-active": 2.25,
  /** The tick in a checkbox. */
  check: 1.5,
};

/** Blur radii, in pixels. `xs` is Tailwind's own step, named here so code can read it. */
export const blur = {
  xs: 4,
};

/**
 * How strongly a colour shows through, faintest first: `bg-primary/tint`, `ring-ring/half`.
 * A colour faded by a bare number (`bg-primary/10`) is flagged by lint.
 */
export const opacity = {
  /** A hint of colour: a hovered row or item, a note's background. */
  faint: "8%",
  /** An accent fill: an icon chip, the selected item, a hairline ring, the haze under a trend line. */
  tint: "12%",
  /** Soft fill under a line or inside a shape; an invalid field's ring. */
  wash: "22%",
  /** Pushed back: a dimmed bar or mark, muted ink on the side rail, a scrim, a dark-mode field. */
  recessed: "35%",
  /** Half strength: the focus ring, a hovered muted fill, secondary ink. */
  half: "50%",
  /** Mostly there: a pressed or hovered solid, a table header's fill. */
  strong: "70%",
  /** A bar, header or tooltip over content that scrolls or plots beneath it. */
  glass: "90%",
};

/** Shadows follow `--shadow`, so they deepen in dark mode. sm/md/lg keep Tailwind's geometry. */
export const shadow = {
  card: "0 6px 20px var(--shadow)",
  /** A card resting on the page: no rule, lifted by a near and a far shadow. */
  surface: "0 1px 2px var(--surface-shadow-near), 0 8px 24px var(--surface-shadow-far)",
  hairline: "0 1px 0 var(--shadow)",
  sm: "0 1px 3px 0 var(--shadow), 0 1px 2px -1px var(--shadow)",
  md: "0 4px 6px -1px var(--shadow), 0 2px 4px -2px var(--shadow)",
  lg: "0 10px 15px -3px var(--shadow), 0 4px 6px -4px var(--shadow)",
};

/** Named grid column templates: `grid-cols-handicap-breakdown`. */
export const gridColumns = {
  "handicap-breakdown": "1fr auto auto auto",
  /** The dashboard's last round: the round, then how it went, as wide as its line is drawn. */
  "last-round": "minmax(0, 1fr) 23.75rem",
  /** The dashboard's row of cards: three figures, then the goal a little wider. */
  "dashboard-cards": "repeat(3, minmax(0, 1fr)) 1.15fr",
  /** A label column, then two equal state columns (default, disabled). */
  "state-grid": "6rem repeat(2, minmax(0, 1fr))",
};

/**
 * Viewport widths, in rem, so a query switches where Tailwind's `sm:` does even
 * when the browser's default text size isn't 16px. `sm` is Tailwind's own.
 */
export const breakpoints = {
  sm: 40,
  /** Tailwind's own: the side rail and the desktop layouts start here. */
  md: 48,
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
  /** A panel opening under the control that asked for it. */
  expand: { duration: 0.25, ease: [0.22, 1, 0.36, 1] as Ease },
  /** A section fading up as it scrolls into view (`Reveal`). */
  reveal: { duration: 0.65, ease: [0.22, 1, 0.36, 1] as Ease },
  /** The card being read while a scan runs: it breathes, a line sweeps it, its corners pulse, the step rail fills. */
  scanProgress: { breathe: 2.6, sweep: 1.6, pulse: 1.8, cornerStagger: 0.45, step: 0.4 },
  /** The try-it panel moving between its steps. */
  scanStep: { upload: 0.3, processing: 0.25, review: 0.35 },
  /**
   * The landing page demo's cinematic timings. Not interaction values: a scanner crossing a card,
   * one image replacing another, a finger pressing a button on a captured screen.
   */
  demo: {
    /** One image replacing another: the card giving way to the scorecard. */
    crossfade: 0.8,
    /** The scan line's full travel, top to bottom. */
    sweep: 1.5,
    /** A field or chip drawing the eye as the form fills itself in. */
    emphasis: 0.3,
    /** How far an emphasised choice swells before settling back. */
    emphasisScale: 1.05,
    /** One on/off of the text caret in the name field. */
    caretBlink: 0.8,
    /** Between the letters of a name typing itself in. */
    typeStagger: 0.1,
    /** Mapped rows sliding in, looser than `spring` so they overshoot into place. */
    rowSpring: { type: "spring" as const, damping: 15 },
    /** One app screen giving way to the next on the tour. */
    screenChange: 0.5,
    /** The incoming screen settling from just past full size. */
    screenEnterScale: 1.02,
    /** The read scorecard settling from past full size as it replaces the photo. */
    scorecardEnterScale: 1.05,
    /** Stepped back: the photo as the card replaces it, the panel as it leaves, a chip before it lights up. */
    recedeScale: 0.95,
    /** A finger pressing the handicap: the ring closing in from wide, pressing, then letting go. */
    tap: { duration: 0.7, reachScale: 1.6, pressScale: 0.8 },
  },
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
  /** The dotted guide lines charts draw behind their data: grid rings, reference lines, the hover crosshair. */
  guideDash: "3 3",
  /** Widest a Recharts bar grows when there are few of them. */
  barMaxWidth: 28,
  /**
   * Score over handicap index, stacked as two small multiples that share the round axis.
   * Unitless, scaled to the container. The grid ends `axis` short of the right edge,
   * where the tick labels sit.
   */
  stack: {
    width: 544,
    /** A phone's narrower drawing. */
    widthCompact: 320,
    /** Room right of the grid for tick labels, and the gap between the grid and them. */
    axis: 44,
    labelGap: 10,
    /** How far a tick label's baseline sits below its line, so the figure centres on it. */
    labelDrop: 4,
    /** Slack at either end of the round axis, so a dot never sits on the plot's edge. */
    inset: 6,
    /** Both panels: the drawing's height, each panel's title baseline, its grid's top and bottom, the round numbers' baseline. */
    both: {
      height: 320,
      score: { title: 8, top: 22, bottom: 172 },
      handicap: { title: 214, top: 226, bottom: 292 },
      ticks: 314,
    },
    /** One panel alone: the card above it names the line, so there is no title. The rooms are what the grid and the round numbers leave at the foot. */
    single: { height: 200, compactHeight: 220, top: 12, bottomRoom: 28, ticksRoom: 6 },
    dot: 3.75,
    dotCounts: 4.5,
    dotLast: 4,
    dotHover: 6,
    /** The five-round average under the dots, and the handicap line. */
    stroke: 2.5,
    strokeHandicap: 2,
    dash: "3 4",
    /** The legend's swatch for the average line. */
    legendLine: 16,
    /** Where the handicap's last figure sits, up and to the left of its dot. */
    lastLift: 8,
    /** Where the last score sits, straight above its dot. */
    scoreLift: 10,
  },
  /** A figure's trend line. */
  /** The last round's running score to par, hole by hole: the dashboard's "How it went". */
  running: {
    width: 380,
    height: 150,
    /** Where the first hole and the last sit, from the left; the line starts at level on the edge. */
    first: 12,
    last: 368,
    top: 18,
    bottom: 134,
    widthCompact: 314,
    heightCompact: 92,
    firstCompact: 10,
    lastCompact: 304,
    topCompact: 10,
    bottomCompact: 82,
    stroke: 3,
    level: 1.5,
    levelDash: "2 6",
    dot: 6,
    dotCompact: 5,
    rim: 3,
    rimCompact: 2.5,
    /** How far the closing figure sits above the last point, and level's "E" below the line. */
    closeLift: 14,
    levelDrop: 18,
  },
  /** A goal's progress as a ring. */
  /** `strokeThick` is the phone's: the ring is drawn smaller there, so its stroke grows to hold. */
  progressRing: { size: 96, radius: 40, stroke: 10, strokeThick: 11 },
  sparkline: {
    width: 300,
    height: 56,
    pad: space.tight,
    stroke: 2,
    dot: space.dot,
    /** The compact line beside a KPI tile's figure, drawn at its own size so the stroke stays 2px. */
    compact: { width: 96, height: 32 },
    /** The flat line under a card's lead figure: the scoring average's. No end dot. */
    card: { width: 150, height: 30, pad: 4, stroke: 2.5, dot: 0 },
    /** The small line beside a figure in a phone's header card: the handicap's. Its end dot filled. */
    mini: { width: 44, height: 30, pad: 3, stroke: 2.5, dot: 3 },
  },
  /** A golfer's scores over time, one dot per round. */
  trend: {
    width: 560,
    height: size.chart,
    pad: { top: 16, right: 16, bottom: 28, left: 36 },
    /** Room either side of the lowest and highest score, in strokes. */
    headroom: 3,
    stroke: 2.5,
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
    /** The goal line, the line through the scores, and the ring round a score that missed. */
    stroke: 1.5,
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
  /** The running score through a round, a step per hole, as wide as `w-chart-wide`, which it scrolls at. */
  flow: {
    width: px(size["chart-wide"]),
    height: 270,
    /** `top` leaves room above the plot for the worst-stretch bracket; `bottom` for the hole strip under it. */
    pad: { top: 32, right: 24, bottom: 74, left: 36 },
    stroke: 2,
    /** The dot where the line ends. */
    dot: 4,
    /** From an axis label, or the end dot's label, to what it labels. */
    labelGap: 10,
    /** The strip of hole marks under the plot: its gap from the plot and from the hole numbers. */
    chip: { gap: 20 },
    /** The bracket over the worst stretch: its height above the plot, and its end ticks. */
    bracket: { rise: 7, tick: 5 },
  },
  /** A hole's score marked the way a scorecard marks it, in a `w-hole-w h-hole-h` box: circles under par, boxes over. */
  holeShape: {
    width: size["hole-w"],
    height: size["hole-h"],
    circle: 9.5,
    /** The eagle's dot inside its circle. */
    dot: 5,
    /** The eagle's ring and the hatching over a triple. */
    stroke: 1.5,
    /** The double's outer box. */
    strokeThin: 1.25,
    /** Corner radii: par's box is the softest, a double's inner box the tightest. */
    corner: { par: 3, outer: 2.5, box: 2, inner: 1.5 },
    /** How far each box sits inside the mark: half a pixel keeps the edge crisp; a double's inner box sits deeper. */
    inset: { box: 0.5, inner: 2.5 },
    /** The triple's hatching, as `[x1, y1, x2, y2]` lines across the box. */
    hatch: [
      [0, 7, 7, 0],
      [0, 18, 18, 0],
      [0, size["hole-h"], size["hole-w"], 0],
      [14, size["hole-h"], size["hole-w"], 8],
    ],
  },
};

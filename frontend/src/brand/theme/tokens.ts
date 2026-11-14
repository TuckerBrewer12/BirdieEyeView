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

export interface Alias {
  alias: string;
}
export interface Mix {
  mix: [base: string, over: string, percent: number];
}
export interface Alpha {
  alpha: [color: string, opacity: number];
}
export type ColorValue = string | Alias | Mix | Alpha;

export interface ColorTree {
  [key: string]: ColorValue | ColorTree;
}

const alias = (name: string): Alias => ({ alias: name });
const mix = (base: string, over: string, percent: number): Mix => ({ mix: [base, over, percent] });
const alpha = (color: string, opacity: number): Alpha => ({ alpha: [color, opacity] });

const score = (
  kind: string,
  base: string,
  muted: string,
  onMuted: string,
  { onBase = white, text = alias(`score-${kind}-base`) }: { onBase?: string; text?: ColorValue } = {},
) => ({ base, muted, onBase, onMuted, text });

const status = (kind: string, base: string, text: ColorValue = alias(`status-${kind}-base`)) => ({
  base,
  onBase: white,
  text,
});

const light = {
  background: sage[25],
  foreground: sage[800],
  foregroundSecondary: sage[600],
  card: white,
  cardForeground: alias("foreground"),
  muted: sage[100],
  mutedForeground: sage[500],
  border: sage[200],
  borderStrong: sage[300],
  input: alias("border-strong"),
  ring: alias("primary"),
  primary: fairway[700],
  primaryHover: fairway[800],
  primaryForeground: white,
  secondary: alias("muted"),
  secondaryForeground: alias("foreground"),
  secondaryHover: mix("secondary", "foreground", 5),
  accent: fairway[50],
  accentForeground: alias("foreground"),
  destructive: red[700],
  destructiveHover: red[800],
  shadow: alpha(slate[900], 0.1),
  surfaceShadow: { near: alpha(sage[900], 0.04), far: alpha(sage[900], 0.06) },

  status: {
    info: status("info", denim[700]),
    success: status("success", emerald[700]),
    warning: status("warning", yellow[700]),
    danger: status("danger", red[700]),
  },

  chart: {
    series1: alias("primary"),
    series2: denim[500],
    grid: sage[150],
    reference: sage[400],
    axis: alias("foreground-secondary"),
    muted: gray[200],
    accent: green[400],
  },

  sidebar: {
    DEFAULT: forest[800],
    foreground: white,
  },

  score: {
    eagle: score("eagle", yellow[700], amber[100], amber[800]),
    birdie: score("birdie", emerald[700], emerald[100], emerald[800]),
    par: score("par", gray[200], gray[100], gray[700], { onBase: gray[600], text: gray[600] }),
    bogey: score("bogey", red[600], red[100], red[800]),
    double: score("double", blue[600], blue[100], blue[800]),
    triple: score("triple", violet[600], violet[100], violet[800]),
    quad: score("quad", violet[900], violet[200], violet[900]),
  },

  scanRow: {
    name: slate[600],
    score: alias("primary"),
    putts: sky[700],
    shots: alias("score-quad-base"),
  },
  scanLine: green[400],
  scanShade: alpha(sage[900], 0.28),

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

export function isColorValue(value: ColorValue | ColorTree): value is ColorValue {
  return typeof value === "string" || "alias" in value || "mix" in value || "alpha" in value;
}

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
    shadow: alpha(black, 0.55),
    surfaceShadow: { near: alpha(black, 0.3), far: alpha(black, 0.35) },
    status: {
      info: { text: blue[400] },
      success: { text: emerald[400] },
      warning: { text: amber[400] },
      danger: { text: red[400] },
    },
    chart: { series2: blue[400], grid: charcoal[850], reference: charcoal[400], muted: charcoal[700] },
  }),
};

export function cssName(path: string[]): string {
  return path
    .filter((key) => key !== "DEFAULT")
    .map((key) => key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`))
    .join("-");
}

export type ColorRefs<T> = { readonly [K in keyof T]: T[K] extends ColorValue ? string : ColorRefs<T[K]> };

function refs<T extends ColorTree>(tree: T, path: string[] = []): ColorRefs<T> {
  return Object.fromEntries(
    Object.entries(tree).map(([key, value]) => [
      key,
      isColorValue(value) ? `var(--${cssName([...path, key])})` : refs(value, [...path, key]),
    ]),
  ) as ColorRefs<T>;
}

export const color = refs(light);

export const font = {
  sans: '"DM Sans", system-ui, sans-serif',
  mono: '"DM Mono", monospace',
};

export const leading = {
  display: 1.1,
  scoreboard: 0.9,
};

export const tracking = {
  name: -0.3,
  title: -0.5,
  display: -0.6,
  stat: -0.8,
  hero: -1.8,
  scoreboard: -2.5,
  chip: 0.5,
  eyebrow: 1.4,
};

export interface TypeRole {
  size: number;
  weight?: number;
  tracking?: number | string;
  leading?: number;
}

export const type = {
  caption: { size: 9 },
  meta: { size: 10 },
  label: { size: 11 },
  "body-sm": { size: 12 },
  body: { size: 13 },
  "body-lg": { size: 15 },
  subhead: { size: 17, weight: 600 },
  title: { size: 26, weight: 700, tracking: tracking.title },
  heading: { size: 30, weight: 600, tracking: tracking.title },
  figure: { size: 34, weight: 600, tracking: tracking.display },
  "figure-sm": { size: 28, weight: 600, tracking: tracking.display },
  "figure-lg": { size: 36, weight: 600, tracking: tracking.display },
  "display-sm": { size: 36, weight: 800, tracking: tracking.hero, leading: leading.display },
  display: { size: 48, weight: 800, tracking: tracking.hero, leading: leading.display },
  "display-lg": { size: 60, weight: 800, tracking: tracking.hero, leading: leading.display },
  name: { size: 22, weight: 600, tracking: tracking.name },
  scoreboard: { size: 76, weight: 600, tracking: tracking.scoreboard, leading: leading.scoreboard },
  "scoreboard-sm": { size: 52, weight: 600, tracking: tracking.scoreboard, leading: leading.scoreboard },
  hero: { size: 44, weight: 700, tracking: tracking.hero, leading: 1 },
  eyebrow: { size: 10, weight: 700, tracking: tracking.eyebrow },
  stat: { size: 32, weight: 700, tracking: tracking.stat, leading: leading.display },
} satisfies Record<string, TypeRole>;

export const space = {
  bar: 1.5,
  hair: 2.5,
  chip: 3,
  dot: 3,
  "page-phone": 18,
  page: 44,
  tight: 5,
  nudge: 5,
  "nudge-sm": 3,
  "safe-bottom": "max(env(safe-area-inset-bottom, 0px), 22px)",
  nav: 62,
  "above-nav": "calc(var(--brand-space-nav) + 1px + var(--brand-space-safe-bottom))",
  "page-end-phone": "calc(var(--brand-space-above-nav) + 1.5rem)",
  "action-bar": 73,
  "page-end-action-bar": "calc(var(--brand-space-page-end-phone) + var(--brand-space-action-bar))",
  "page-end-pinned": "calc(var(--brand-space-action-bar) + 3rem)",
};

export const radiusBase = "0.5rem";

export const radius = {
  photo: 14,
  sm: "0.25rem",
  md: "0.375rem",
  lg: "0.5rem",
  xl: "0.75rem",
  bar: 1.5,
  tick: 2,
  card: 10,
  surface: 22,
  lead: 24,
  "lead-phone": 26,
  sheet: 20,
  addon: "calc(var(--radius) - var(--brand-space-nudge))",
  control: "calc(var(--radius) - var(--brand-space-nudge-sm))",
};

export const size = {
  rail: 240,
  preview: 390,
  "scan-photo": 360,
  "card-photo": 300,
  "photo-thumb": 64,
  dropzone: 340,
  chart: 180,
  "chart-compact": 210,
  "chart-wide": "45rem",
  "chart-flow": "30.75rem",
  sheet: 420,
  "sheet-tall": 640,
  radar: "28.75rem",
  columns: 104,
  tab: 42,
  "icon-xs": 11,
  "icon-sm": 13,
  "icon-md": 18,
  "sparkline-card": 150,
  "sparkline-mini": 44,
  "hole-w": 30,
  "hole-h": 22,
  "hole-lg": 28,
  "profile-eagle": "28%",
  "profile-birdie": "40%",
  "profile-par": "52%",
  "profile-bogey": "72%",
  "profile-double": "92%",
  "profile-worse": "100%",
  scorecard: "43.75rem",
  "scorecard-round": "54rem",
};

export const lineWidth = {
  border: 1,
  ring: 3,
  outline: 1.5,
};

export const scan = {
  lineFrom: 20,
  lineTo: 86,
};

export const borderWidth = {
  callout: lineWidth.outline,
};

export const stroke = {
  icon: 1.75,
  "icon-active": 2.25,
  check: 1.5,
};

export const blur = {
  xs: 4,
};

export const opacity = {
  faint: "8%",
  tint: "12%",
  wash: "22%",
  recessed: "35%",
  settled: "75%",
  half: "50%",
  strong: "70%",
  glass: "90%",
};

export const shadow = {
  card: "0 6px 20px var(--shadow)",
  surface: "0 1px 2px var(--surface-shadow-near), 0 8px 24px var(--surface-shadow-far)",
  "scan-line": "0 0 12px 2px var(--scan-line)",
  photo: "0 12px 32px var(--shadow)",
  hairline: "0 1px 0 var(--shadow)",
  sm: "0 1px 3px 0 var(--shadow), 0 1px 2px -1px var(--shadow)",
  md: "0 4px 6px -1px var(--shadow), 0 2px 4px -2px var(--shadow)",
  lg: "0 10px 15px -3px var(--shadow), 0 4px 6px -4px var(--shadow)",
};

export const gridColumns = {
  "scan-photo": "18.75rem minmax(0, 1fr)",
  "scan-review": "minmax(0, 1.15fr) minmax(0, 1fr)",
  "scan-manual": "minmax(0, 2fr) minmax(0, 1fr) minmax(0, 1fr)",
  "handicap-breakdown": "1fr auto auto auto",
  "last-round": "minmax(0, 1fr) 23.75rem",
  "round-row": "3.25rem minmax(0, 1fr) minmax(0, 1.3fr) 2.5rem 2.5rem",
  "dashboard-cards": "repeat(3, minmax(0, 1fr)) 1.15fr",
  "round-summary": "1.1fr 1fr 1fr 1fr 1.6fr",
  "round-summary-phone": "1.3fr 1fr 1fr 1fr",
  "round-detail": "minmax(0, 1.35fr) minmax(0, 1fr)",
  "versus-row": "minmax(0, 1fr) 2.75rem 2.75rem 3.25rem",
  "course-row": "minmax(0, 1fr) 9.375rem 10.625rem 1rem",
  "course-record": "minmax(0, 1fr) minmax(0, 1.4fr)",
  "analytics-pair": "minmax(0, 1fr) minmax(0, 1.6fr)",
  "analytics-putting": "minmax(0, 1.4fr) minmax(0, 1fr)",
  "analytics-goal": "17.5rem minmax(0, 1fr)",
  "par-bar": "2.75rem minmax(0, 1fr) 2.75rem",
  "peak-table": "minmax(0, 1fr) 4.375rem 4.375rem 5rem",
  "state-grid": "6rem repeat(2, minmax(0, 1fr))",
};

export const breakpoints = {
  sm: 40,
  md: 48,
};

type Ease = [number, number, number, number];

export const motion = {
  hoverScale: 1.015,
  tapScale: 0.98,
  spring: { type: "spring" as const, stiffness: 400, damping: 30 },
  duration: { collapse: 0.2 },
  draw: { duration: 1.4, ease: "easeInOut" as const },
  entrance: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as Ease },
  layout: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as Ease },
  scanLine: 0.8,
  scanStep: { upload: 0.3, processing: 0.25, review: 0.35 },
  demo: {
    crossfade: 0.8,
    sweep: 1.5,
    screenChange: 0.5,
    screenEnterScale: 1.02,
    recedeScale: 0.95,
    tap: { duration: 0.7, reachScale: 1.6, pressScale: 0.8 },
  },
};

function px(length: number | string): number {
  if (typeof length === "number") return length;
  const rem = /^(-?[\d.]+)rem$/.exec(length);
  if (!rem) throw new Error(`${length} is not a pixel or rem length`);
  return Number(rem[1]) * 16;
}

export const chart = {
  guideDash: "3 3",
  handicapTrend: {
    width: 544,
    widthCompact: 320,
    height: 200,
    compactHeight: 220,
    top: 12,
    bottomRoom: 28,
    ticksRoom: 6,
    axis: 44,
    labelGap: 10,
    labelDrop: 4,
    inset: 6,
    dotLast: 4,
    dotHover: 6,
    stroke: 2,
    lastLift: 8,
  },
  running: {
    width: 380,
    height: 150,
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
    closeLift: 14,
    levelDrop: 18,
  },
  progressRing: { size: 96, radius: 40, stroke: 10, strokeThick: 11 },
  donut: { size: 96, outer: 46, inner: 30, padAngle: 0.04, corner: 2 },
  sparkline: {
    width: 300,
    height: 56,
    pad: space.tight,
    stroke: 2,
    dot: space.dot,
    compact: { width: 96, height: 32 },
    card: { width: size["sparkline-card"], height: 30, pad: 4, stroke: 2.5, dot: 0 },
    mini: { width: size["sparkline-mini"], height: 30, pad: 3, stroke: 2.5, dot: 3 },
  },

  radar: {
    width: 392,
    height: 324,
    radius: 96,
    labelGap: 16,
    valueGap: 16,
    rings: [25, 50, 75, 100],
    dot: 5,
    stroke: 2.5,
    strokeSecondary: 1.5,
  },
  radarCompact: {
    width: 360,
    height: 300,
    radius: 72,
    labelGap: 16,
    valueGap: 16,
  },
  goal: {
    width: 600,
    minWidth: 240,
    height: 150,
    pad: { x: 20, y: 28 },
    labelRoom: 64,
    stroke: 1.5,
    dot: 4,
    dotReached: 5.5,
  },
  trendArea: {
    width: 560,
    minWidth: 280,
    height: 260,
    pad: { top: 8, right: 16, bottom: 28, left: 44 },
    flatSpan: 1,
    stroke: 3,
    strokeSecondary: 2.5,
    dot: 6.4,
    dotHover: 8.5,
    maxDots: 30,
    xTicks: 6,
    yTicks: 4,
    countHeight: 120,
    countDot: 4,
    countDotHover: 6,
    countTicks: 3,
    panelGap: 28,
    countFloor: 4,
    windowMin: 5,
  },
  tooltipFlip: 0.65,
  holes: {
    width: px(size["chart-wide"]),
    minWidth: px(size["chart-flow"]),
    height: 240,
    pad: { top: 16, right: 12, bottom: 32, left: 40 },
    bar: 0.56,
    corner: 3,
    level: 3,
    whisker: 1.5,
    cap: 4,
    labelGap: 10,
    numberDrop: 20,
    greens: { top: 22, bottom: 112 },
    putts: { top: 156, bottom: 226 },
    pairedHeight: 260,
    numbers: 252,
    dot: 4,
    stem: 2,
  },
  flow: {
    width: px(size["chart-wide"]),
    minWidth: px(size["chart-flow"]),
    height: 270,
    pad: { top: 32, right: 24, bottom: 74, left: 36 },
    stroke: 2,
    dot: 4,
    labelGap: 10,
    chip: { gap: 20 },
    bracket: { rise: 7, tick: 5 },
  },
  holeShape: {
    width: size["hole-w"],
    height: size["hole-h"],
    circle: 9.5,
    dot: 5,
    stroke: 1.5,
    strokeThin: 1.25,
    corner: { par: 3, outer: 2.5, box: 2, inner: 1.5 },
    inset: { box: 0.5, inner: 2.5 },
    hatch: [
      [0, 7, 7, 0],
      [0, 18, 18, 0],
      [0, size["hole-h"], size["hole-w"], 0],
      [14, size["hole-h"], size["hole-w"], 8],
    ],
    squareHatch: [
      [0, 7, 7, 0],
      [0, 15, 15, 0],
      [0, size["hole-h"], size["hole-h"], 0],
      [7, size["hole-h"], size["hole-h"], 7],
      [15, size["hole-h"], size["hole-h"], 15],
    ],
  },
};

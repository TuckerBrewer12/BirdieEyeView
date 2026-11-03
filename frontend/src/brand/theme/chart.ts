import type { CSSProperties } from "react";
import { colors } from "./colors";
import { borderWidth, radius } from "./space";
import { typography } from "./type";

export const chartTooltipStyle: CSSProperties = {
  fontSize: typography.bodySm,
  borderRadius: radius.tooltip,
  border: `${borderWidth} solid ${colors.border}`,
  boxShadow: "var(--shadow-card)",
  background: colors.card,
};

export const chartTickStyle = {
  fontSize: typography.label,
} as const;

/** Recharts only accepts numbers for layout, so these mirror tokens.css in pixels:
 *  `barRadius` is --brand-radius-md, `barMaxWidth` --brand-size-bar-max, `ring` and `gauge`
 *  --brand-size-ring-* and --brand-size-gauge-*, `plot.height` --brand-size-chart, and
 *  `plotCompact` --brand-size-chart-compact-w and --brand-size-chart-compact.
 *  `sparkline` is --brand-size-sparkline-w/-h, --brand-space-tight padding, --brand-sparkline-stroke
 *  and a --brand-space-dot marker, `flow.width` --brand-size-chart-wide, and `trendArea.height` --brand-size-chart. tokens.test.ts fails if one drifts. The plot margins follow the 4px spacing scale. */
export const chartLayout = {
  barRadius: [6, 6, 0, 0] as [number, number, number, number],
  stackEndRadius: {
    left: [4, 0, 0, 4] as [number, number, number, number],
    right: [0, 4, 4, 0] as [number, number, number, number],
  },
  margin: { top: 4, right: 8, left: -20, bottom: 0 },
  barMaxWidth: 28,
  ring: { inner: 50, outer: 68 },
  gauge: { inner: 52, outer: 72 },
  plot: {
    width: 560,
    height: 180,
    pad: { top: 12, right: 64, bottom: 20, left: 52 },
    barMin: 4,
    barMax: 14,
    barGap: 2,
    dot: 3.5,
    dotHover: 6,
  },
  plotCompact: {
    width: 320,
    height: 210,
    pad: { top: 16, right: 16, bottom: 32, left: 44 },
  },
  sparkline: {
    width: 300,
    height: 56,
    pad: 5,
    stroke: 2,
    dot: 3,
  },
  trend: {
    width: 560,
    height: 180,
    pad: { top: 16, right: 16, bottom: 28, left: 36 },
    headroom: 3,
    dot: 4,
    dotHover: 6,
    maxTicks: 12,
  },
  radar: {
    width: 560,
    height: 340,
    radius: 118,
    labelGap: 18,
    valueGap: 16,
    rings: [25, 50, 75, 100],
    dot: 4,
    stroke: 2,
  },
  radarCompact: {
    width: 360,
    height: 300,
    radius: 72,
    labelGap: 16,
    valueGap: 16,
  },
  goal: {
    width: 560,
    height: 96,
    pad: { x: 8, y: 14 },
    labelRoom: 32,
    dot: 4,
    dotReached: 5.5,
  },
  trendArea: {
    width: 560,
    height: 180,
    pad: { top: 12, right: 16, bottom: 24, left: 40 },
    headroom: 0.15,
    stroke: 2,
    strokeSecondary: 1.5,
    dot: 3,
    dotHover: 5,
    maxDots: 30,
    xTicks: 6,
    yTicks: 4,
  },
  target: {
    size: 200,
    rings: { eagle: 0.18, birdie: 0.35, par: 0.55, bogey: 0.7, double: 0.83, triple: 1 },
    stroke: 1.5,
    dot: 3.5,
    dotHover: 5,
    hitRadius: 10,
  },
  flow: {
    width: 720,
    height: 220,
    pad: { top: 28, right: 16, bottom: 36, left: 40 },
    extent: 5,
    dot: 4,
    dotHover: 6,
  },
};

export const chartColors = {
  axis: "var(--chart-axis)",
  muted: "var(--chart-muted)",
  accent: "var(--chart-accent)",
} as const;

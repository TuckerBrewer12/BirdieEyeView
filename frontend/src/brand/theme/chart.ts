import type { CSSProperties } from "react";
import { colors } from "./colors";
import { borderWidth, radius } from "./space";
import { typography } from "./type";

/**
 * Recharts `contentStyle`. Chart libraries take a style object, so they cannot
 * use Tailwind classes — this is the same path as `colors.card` in a fill.
 * Surfaces, border, type, and shadow are the existing kit tokens.
 */
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
 *  --brand-size-ring-* and --brand-size-gauge-*, and `plot.height` --brand-size-chart.
 *  tokens.test.ts fails if one drifts. The plot margins follow the 4px spacing scale. */
export const chartLayout = {
  barRadius: [6, 6, 0, 0] as [number, number, number, number],
  margin: { top: 4, right: 8, left: -20, bottom: 0 },
  /** Widest a Recharts bar grows when there are few of them. */
  barMaxWidth: 28,
  /** A full ring sized to fill the chart height. */
  ring: { inner: 50, outer: 68 },
  /** A half gauge drawn up from the bottom edge of its box. */
  gauge: { inner: 52, outer: 72 },
  /** Unitless SVG plot. Matches `--brand-size-chart` for height. */
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
};

export const chartColors = {
  axis: "var(--chart-axis)",
  muted: "var(--chart-muted)",
  accent: "var(--chart-accent)",
} as const;

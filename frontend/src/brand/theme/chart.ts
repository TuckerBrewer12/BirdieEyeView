import type { CSSProperties } from "react";
import { color, lineWidth, radius, type } from "./tokens";

/**
 * Recharts `contentStyle`. Chart libraries take a style object rather than
 * classes, so the tooltip's card, border, type and shadow come from the tokens here.
 */
export const chartTooltipStyle: CSSProperties = {
  fontSize: type["body-sm"].size,
  borderRadius: radius.tooltip,
  border: `${lineWidth.border}px solid ${color.border}`,
  boxShadow: "var(--shadow-card)",
  background: color.card,
};

/** Recharts axis ticks: label-sized, in the axis colour. */
export const chartTickStyle = {
  fontSize: type.label.size,
  fill: color.chart.axis,
} as const;

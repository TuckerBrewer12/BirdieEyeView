import { color, type } from "./tokens";

/** A chart's axis ticks: label-sized, in the axis colour. */
export const chartTickStyle = {
  fontSize: type.label.size,
  fill: color.chart.axis,
} as const;

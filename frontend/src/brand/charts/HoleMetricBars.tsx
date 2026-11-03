import { useId } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { chartTickStyle, chartTooltipStyle, color, tokens } from "@/brand/theme";
import { formatPercent } from "@/domain/format";
import type { HoleFigure } from "@/domain/courseAnalytics";
import { holeLabel, type TooltipFormatter } from "./holeBarParts";

interface HoleMetricBarsProps {
  /** The figure the rows hold. Variance rows come ranked, least consistent first, so the ticks name their holes. */
  metric: "gir" | "putts" | "variance";
  rows: HoleFigure[];
}

const METRICS = {
  gir: {
    label: "GIR %",
    format: (value: number) => formatPercent(value, 1),
    domain: [0, 100] as [number, number],
    gradient: [color("chart-accent"), color("primary")],
    tick: undefined,
  },
  putts: {
    label: "Avg putts",
    format: (value: number) => value.toFixed(2),
    domain: undefined,
    gradient: [color("muted"), color("muted-foreground")],
    tick: undefined,
  },
  variance: {
    label: "Std dev",
    format: (value: number) => value.toFixed(2),
    domain: undefined,
    gradient: [color("score-eagle-base"), color("score-bogey-base")],
    tick: holeLabel,
  },
} as const;

/** One figure per hole as a bar: GIR rate, average putts, or how much the score swings. */
export function HoleMetricBars({ metric, rows }: HoleMetricBarsProps) {
  const spec = METRICS[metric];
  const gradientId = `hole-metric-${metric}-${useId().replace(/:/g, "")}`;

  return (
    <div data-slot="hole-metric-bars" className="h-chart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={tokens.chart.margin}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={spec.gradient[0]} stopOpacity={1} />
              <stop offset="100%" stopColor={spec.gradient[1]} stopOpacity={1} />
            </linearGradient>
          </defs>
          <XAxis dataKey="hole" tickFormatter={spec.tick} tick={chartTickStyle} tickLine={false} axisLine={false} />
          <YAxis domain={spec.domain} tick={chartTickStyle} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={chartTooltipStyle}
            formatter={((value: number) => [spec.format(Number(value ?? 0)), spec.label]) as TooltipFormatter}
          />
          <Bar dataKey="value" fill={`url(#${gradientId})`} radius={tokens.chart.barRadius} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

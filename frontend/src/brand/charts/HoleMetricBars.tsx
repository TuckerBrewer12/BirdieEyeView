import { useId } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { chartColors, chartLayout, chartTooltipStyle, colors } from "@/brand/theme";
import type { CourseHoleGirRowDto, CourseHolePuttsRowDto, CourseHoleVarianceRowDto } from "@/types/api";
import { AXIS_TICK, holeLabel, type TooltipFormatter } from "./holeBarParts";

type HoleMetricBarsProps =
  | { metric: "gir"; rows: CourseHoleGirRowDto[] }
  | { metric: "putts"; rows: CourseHolePuttsRowDto[] }
  /** Variance rows come ranked, least consistent first, so the ticks name their holes. */
  | { metric: "variance"; rows: CourseHoleVarianceRowDto[] };

const METRICS = {
  gir: {
    dataKey: "gir_percentage",
    label: "GIR %",
    format: (value: number) => `${value.toFixed(1)}%`,
    domain: [0, 100] as [number, number],
    gradient: [chartColors.accent, colors.primary],
    tick: undefined,
  },
  putts: {
    dataKey: "average_putts",
    label: "Avg putts",
    format: (value: number) => value.toFixed(2),
    domain: undefined,
    gradient: [colors.muted, colors.mutedForeground],
    tick: undefined,
  },
  variance: {
    dataKey: "score_std_dev",
    label: "Std dev",
    format: (value: number) => value.toFixed(2),
    domain: undefined,
    gradient: [colors.score.eagle.base, colors.score.bogey.base],
    tick: holeLabel,
  },
} as const;

/** One figure per hole as a bar: GIR rate, average putts, or how much the score swings. */
export function HoleMetricBars({ metric, rows }: HoleMetricBarsProps) {
  const spec = METRICS[metric];
  // Every metric's rows are one bar per hole; the spec picks which field the bar reads.
  const data: { hole_number: number }[] = rows;
  const gradientId = `hole-metric-${metric}-${useId().replace(/:/g, "")}`;

  return (
    <div data-slot="hole-metric-bars" className="h-chart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={chartLayout.margin}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={spec.gradient[0]} stopOpacity={1} />
              <stop offset="100%" stopColor={spec.gradient[1]} stopOpacity={1} />
            </linearGradient>
          </defs>
          <XAxis dataKey="hole_number" tickFormatter={spec.tick} tick={AXIS_TICK} tickLine={false} axisLine={false} />
          <YAxis domain={spec.domain} tick={AXIS_TICK} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={chartTooltipStyle}
            formatter={((value: number) => [spec.format(Number(value ?? 0)), spec.label]) as TooltipFormatter}
          />
          <Bar dataKey={spec.dataKey} fill={`url(#${gradientId})`} radius={chartLayout.barRadius} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

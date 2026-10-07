import { Bar, BarChart, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { chartColors, chartLayout, chartTooltipStyle, toParFill } from "@/brand/theme";
import type { CourseHoleToParRowDto } from "@/types/api";
import { AXIS_TICK, holeLabel, type TooltipFormatter } from "./holeBarParts";

interface HoleToParBarsProps {
  rows: CourseHoleToParRowDto[];
  /** The rows are ranked rather than in course order, so each tick names its hole: "H3". */
  ranked?: boolean;
}

/** Average score to par on each hole: a bar up for over par, down for under, painted by the score. */
export function HoleToParBars({ rows, ranked = false }: HoleToParBarsProps) {
  return (
    <div data-slot="hole-to-par-bars" className="h-chart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={chartLayout.margin}>
          <XAxis
            dataKey="hole_number"
            tickFormatter={ranked ? holeLabel : undefined}
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
          />
          <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={chartTooltipStyle}
            formatter={((value: number) => [Number(value ?? 0).toFixed(2), "Avg to Par"]) as TooltipFormatter}
          />
          <ReferenceLine y={0} stroke={chartColors.muted} />
          <Bar dataKey="average_to_par" radius={chartLayout.barRadius} isAnimationActive={false}>
            {rows.map((row) => (
              <Cell key={row.hole_number} fill={toParFill(row.average_to_par)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

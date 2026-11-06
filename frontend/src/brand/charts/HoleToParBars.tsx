import { Bar, BarChart, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { chartTooltipStyle, toParFill, chartTickStyle, tokens } from "@/brand/theme";
import type { HoleToPar } from "@/domain/courseAnalytics";
import { formatAverageToPar } from "@/domain/score";
import { holeLabel, type TooltipFormatter } from "./holeBarParts";

interface HoleToParBarsProps {
  rows: HoleToPar[];
  ranked?: boolean;
}

export function HoleToParBars({ rows, ranked = false }: HoleToParBarsProps) {
  return (
    <div data-slot="hole-to-par-bars" className="h-chart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={tokens.chart.margin}>
          <XAxis
            dataKey="hole"
            tickFormatter={ranked ? holeLabel : undefined}
            tick={chartTickStyle}
            tickLine={false}
            axisLine={false}
          />
          <YAxis tick={chartTickStyle} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={chartTooltipStyle}
            formatter={((value: number) => [formatAverageToPar(Number(value ?? 0)), "Avg to Par"]) as TooltipFormatter}
          />
          <ReferenceLine y={0} stroke={tokens.color.chart.muted} />
          <Bar dataKey="averageToPar" radius={tokens.chart.barRadius} isAnimationActive={false}>
            {rows.map((row) => (
              <Cell key={row.hole} fill={toParFill(row.averageToPar)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

import { Bar, BarChart, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { chartLayout, chartTickStyle, chartTooltipStyle, colors, scoreKindLabel } from "@/brand/theme";
import { formatPercent, pluralize } from "@/domain/format";
import { SCORE_KINDS } from "@/domain/score";
import type { HoleScoreMix } from "@/domain/courseAnalytics";
import { AXIS_TICK, type TooltipFormatter } from "./holeBarParts";

export function HoleScoreMixBars({ rows }: { rows: HoleScoreMix[] }) {
  return (
    <div data-slot="hole-score-mix-bars" className="h-chart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={chartLayout.margin}>
          <XAxis dataKey="hole" tick={AXIS_TICK} tickLine={false} axisLine={false} />
          <YAxis domain={[0, 100]} tick={AXIS_TICK} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={chartTooltipStyle}
            labelFormatter={(_label, payload) =>
              payload?.[0]?.payload?.rounds != null ? pluralize(payload[0].payload.rounds, "round") : ""
            }
            formatter={((value: number) => [formatPercent(Number(value ?? 0), 1), ""]) as TooltipFormatter}
          />
          <Legend wrapperStyle={{ fontSize: chartTickStyle.fontSize }} />
          {SCORE_KINDS.map((kind) => (
            <Bar
              key={kind}
              dataKey={kind}
              stackId="mix"
              fill={colors.score[kind].base}
              name={scoreKindLabel(kind)}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

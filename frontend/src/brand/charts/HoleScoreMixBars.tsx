import { Bar, BarChart, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { chartLayout, chartTickStyle, chartTooltipStyle, colors, scoreKindLabel } from "@/brand/theme";
import { SCORE_KINDS, type ScoreKind } from "@/domain/score";
import type { CourseHoleScoreTypeRowDto } from "@/types/api";
import { AXIS_TICK, type TooltipFormatter } from "./holeBarParts";

/** Where each score kind's percentage sits on the server's row. */
const ROW_KEY: Record<ScoreKind, keyof CourseHoleScoreTypeRowDto> = {
  eagle: "eagle",
  birdie: "birdie",
  par: "par",
  bogey: "bogey",
  double: "double_bogey",
  triple: "triple_bogey",
  quad: "quad_bogey",
};

/** How each hole tends to go: one stacked bar per hole, split by score kind, to 100%. */
export function HoleScoreMixBars({ rows }: { rows: CourseHoleScoreTypeRowDto[] }) {
  return (
    <div data-slot="hole-score-mix-bars" className="h-chart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={chartLayout.margin}>
          <XAxis dataKey="hole_number" tick={AXIS_TICK} tickLine={false} axisLine={false} />
          <YAxis domain={[0, 100]} tick={AXIS_TICK} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={chartTooltipStyle}
            labelFormatter={(_label, payload) =>
              payload?.[0]?.payload?.sample_size != null ? `${payload[0].payload.sample_size} rounds` : ""
            }
            formatter={((value: number) => [`${Number(value ?? 0).toFixed(1)}%`, ""]) as TooltipFormatter}
          />
          <Legend wrapperStyle={{ fontSize: chartTickStyle.fontSize }} />
          {SCORE_KINDS.map((kind) => (
            <Bar
              key={kind}
              dataKey={ROW_KEY[kind]}
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

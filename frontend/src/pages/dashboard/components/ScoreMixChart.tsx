import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { chartTickStyle, chartTooltipStyle, tokens } from "@/brand";
import { formatPercent, type ScoreMix } from "@/domain";
import { colorizeMix } from "../present";

const TICK = { ...chartTickStyle, fontWeight: 700 };

function percent(value: number | string | ReadonlyArray<number | string> | undefined) {
  const base = Array.isArray(value) ? value[0] : value;
  return [formatPercent(typeof base === "number" ? base : Number(base), 1), ""];
}

interface ScoreMixChartProps {
  /** Percent of holes at each score kind. Null, or no holes, shows "No data yet". */
  mix: ScoreMix | null;
}

export function ScoreMixChart({ mix }: ScoreMixChartProps) {
  const bars = mix ? colorizeMix(mix) : [];
  if (bars.length === 0) {
    return <div className="text-sm text-muted-foreground text-center py-8">No data yet</div>;
  }
  return (
    <div data-slot="score-mix-chart" className="h-chart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={bars} margin={tokens.chart.margin}>
          <CartesianGrid stroke={tokens.color.border} vertical={false} />
          <XAxis dataKey="label" tick={TICK} tickLine={false} axisLine={false} />
          <YAxis tick={TICK} tickLine={false} axisLine={false} unit="%" />
          <Tooltip contentStyle={chartTooltipStyle} formatter={percent} />
          <Bar dataKey="value" radius={tokens.chart.barRadius} maxBarSize={tokens.chart.barMaxWidth}>
            {bars.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { chartColors, chartLayout, chartTickStyle, chartTooltipStyle, colors } from "@/brand";
import { formatPercent, type ScoreMix } from "@/domain";
import { colorizeMix } from "../present";

const TICK = { ...chartTickStyle, fill: chartColors.axis, fontWeight: 700 };

function percent(value: number | string | ReadonlyArray<number | string> | undefined) {
  const base = Array.isArray(value) ? value[0] : value;
  return [formatPercent(typeof base === "number" ? base : Number(base), 1), ""];
}

interface ScoreMixChartProps {
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
        <BarChart data={bars} margin={chartLayout.margin}>
          <CartesianGrid stroke={colors.border} vertical={false} />
          <XAxis dataKey="label" tick={TICK} tickLine={false} axisLine={false} />
          <YAxis tick={TICK} tickLine={false} axisLine={false} unit="%" />
          <Tooltip contentStyle={chartTooltipStyle} formatter={percent} />
          <Bar dataKey="value" radius={chartLayout.barRadius} maxBarSize={chartLayout.barMaxWidth}>
            {bars.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { chartColors, chartLayout, chartTickStyle, chartTooltipStyle, colors } from "@/brand";
import type { ScoreMixItem } from "@/domain";
import { colorizeMix } from "../present";

const TICK = { ...chartTickStyle, fill: chartColors.axis, fontWeight: 700 };

function percent(value: number | string | ReadonlyArray<number | string> | undefined) {
  const base = Array.isArray(value) ? value[0] : value;
  const n = typeof base === "number" ? base : Number(base);
  return [Number.isFinite(n) ? `${n.toFixed(1)}%` : `${String(base ?? "")}%`, ""];
}

interface ScoreMixChartProps {
  /** Percent of holes at each score kind. Empty shows "No data yet". */
  mix: ScoreMixItem[];
}

export function ScoreMixChart({ mix }: ScoreMixChartProps) {
  if (mix.length === 0) {
    return <div className="text-sm text-muted-foreground text-center py-8">No data yet</div>;
  }
  const bars = colorizeMix(mix);
  return (
    <div data-slot="score-mix-chart" className="h-chart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={bars} margin={chartLayout.margin}>
          <CartesianGrid stroke={colors.border} vertical={false} />
          <XAxis dataKey="label" tick={TICK} tickLine={false} axisLine={false} />
          <YAxis tick={TICK} tickLine={false} axisLine={false} unit="%" />
          <Tooltip contentStyle={chartTooltipStyle} formatter={percent} />
          <Bar dataKey="value" radius={chartLayout.barRadius} maxBarSize={28}>
            {bars.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

import { Bar, BarChart, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { chartColors, chartLayout, chartTooltipStyle, toParFill } from "@/brand/theme";
import { AXIS_TICK, type TooltipFormatter } from "./holeBarParts";

interface ToParBar {
  /** Under the bar: "Par 3", "7". */
  label: string;
  /** The average score to par. */
  toPar: number;
  /** After the figure in the tooltip, like how many holes it covers. */
  detail?: string;
}

interface ToParBarsProps {
  bars: ToParBar[];
  /** Names the figure in the tooltip. */
  valueLabel?: string;
}

/** A signed average to par, to two places: "+0.84", "-0.10", "0.00". */
function signed(value: number): string {
  return value > 0 ? `+${value.toFixed(2)}` : value.toFixed(2);
}

/**
 * Average score to par for a handful of groups (par types, hole difficulty): a bar up for
 * over par, down for under, painted by the score.
 */
export function ToParBars({ bars, valueLabel = "Avg to Par" }: ToParBarsProps) {
  return (
    <div data-slot="to-par-bars" className="h-chart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={bars} margin={chartLayout.margin}>
          <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={false} interval={0} />
          <YAxis
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value: number) => (value > 0 ? `+${value}` : String(value))}
          />
          <Tooltip
            cursor={{ fill: chartColors.muted }}
            contentStyle={chartTooltipStyle}
            formatter={((value: number, _name: unknown, item: { payload?: ToParBar }) => [
              item.payload?.detail ? `${signed(Number(value))} (${item.payload.detail})` : signed(Number(value)),
              valueLabel,
            ]) as TooltipFormatter}
          />
          <ReferenceLine y={0} stroke={chartColors.muted} />
          <Bar dataKey="toPar" radius={chartLayout.barRadius} isAnimationActive={false}>
            {bars.map((bar) => (
              <Cell key={bar.label} fill={toParFill(bar.toPar)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export type { ToParBar, ToParBarsProps };

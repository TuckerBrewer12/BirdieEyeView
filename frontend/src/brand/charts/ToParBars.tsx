import { Bar, BarChart, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { chartColors, chartLayout, chartTooltipStyle, toParFill } from "@/brand/theme";
import { formatAverageToPar } from "@/domain/score";
import { AXIS_TICK, type TooltipFormatter } from "./holeBarParts";

interface ToParBar {
  label: string;
  toPar: number;
  detail?: string;
}

interface ToParBarsProps {
  bars: ToParBar[];
  valueLabel?: string;
}

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
            tickFormatter={(value: number) => formatAverageToPar(value)}
          />
          <Tooltip
            cursor={{ fill: chartColors.muted }}
            contentStyle={chartTooltipStyle}
            formatter={((value: number, _name: unknown, item: { payload?: ToParBar }) => [
              item.payload?.detail
                ? `${formatAverageToPar(Number(value))} (${item.payload.detail})`
                : formatAverageToPar(Number(value)),
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

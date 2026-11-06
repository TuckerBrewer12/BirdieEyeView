import { Bar, BarChart, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { chartTooltipStyle, toParFill, chartTickStyle, tokens } from "@/brand/theme";
import { formatAverageToPar } from "@/domain/score";
import { type TooltipFormatter } from "./holeBarParts";

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
        <BarChart data={bars} margin={tokens.chart.margin}>
          <XAxis dataKey="label" tick={chartTickStyle} tickLine={false} axisLine={false} interval={0} />
          <YAxis
            tick={chartTickStyle}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value: number) => formatAverageToPar(value)}
          />
          <Tooltip
            cursor={{ fill: tokens.color.chart.muted }}
            contentStyle={chartTooltipStyle}
            formatter={((value: number, _name: unknown, item: { payload?: ToParBar }) => [
              item.payload?.detail
                ? `${formatAverageToPar(Number(value))} (${item.payload.detail})`
                : formatAverageToPar(Number(value)),
              valueLabel,
            ]) as TooltipFormatter}
          />
          <ReferenceLine y={0} stroke={tokens.color.chart.muted} />
          <Bar dataKey="toPar" radius={tokens.chart.barRadius} isAnimationActive={false}>
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

import { useId, type ReactNode } from "react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/brand";
import { chartTickStyle, chartTooltipStyle, tokens } from "@/brand/theme";
import { formatUpToOneDecimal, pluralize } from "@/domain/format";

export interface ComparisonBar {
  label: string;
  value: number | null;
  sampleSize: number;
}

export interface ComparisonChartCardProps {
  title: string;
  primaryLabel: string;
  bars: ComparisonBar[];
  className?: string;
}

type Fmt = (value: unknown, name: unknown, props: unknown) => ReactNode | [ReactNode, string];

/**
 * One cohort comparison: this round's figure, then the bars alongside it.
 *
 * The first bar is this round and takes the accent gradient; the rest recede.
 * Callers pass finished bars — no Round, no ComparisonRow.
 */
function ComparisonChartCard({
  title,
  primaryLabel,
  bars,
  className,
}: ComparisonChartCardProps) {
  const chartData = bars.map((bar, i) => ({
    label: bar.label,
    value: bar.value ?? 0,
    sampleSize: bar.sampleSize,
    isSelected: i === 0,
  }));
  // Mobile and desktop both mount these cards, so a shared gradient id
  // would resolve to the hidden copy and the selected bar would not paint.
  const selectedFill = `selectedBarGrad${useId().replace(/:/g, "")}`;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          <span className="font-bold text-primary">{formatUpToOneDecimal(bars[0]?.value ?? null)}</span>
          {" "}{primaryLabel} this round
        </CardDescription>
      </CardHeader>
      <CardContent className="h-chart">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={tokens.chart.margin}>
            <defs>
              <linearGradient id={selectedFill} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={tokens.color.chart.accent} stopOpacity={1} />
                <stop offset="100%" stopColor={tokens.color.primary} stopOpacity={1} />
              </linearGradient>
            </defs>
            <XAxis dataKey="label" tick={chartTickStyle} tickLine={false} axisLine={false} />
            <YAxis tick={chartTickStyle} tickLine={false} axisLine={false} />
            <Tooltip
              formatter={((v: number, _name: string, props: { payload: { sampleSize: number } }) => [
                formatUpToOneDecimal(v),
                `${primaryLabel} (${pluralize(props.payload.sampleSize, "round")})`,
              ]) as Fmt}
              contentStyle={chartTooltipStyle}
            />
            {/* Recharts grows bars with CSS; Playwright's screenshot pass freezes that at height 0. */}
            <Bar dataKey="value" radius={tokens.chart.barRadius} isAnimationActive={false}>
              {chartData.map((d) => (
                <Cell key={d.label} fill={d.isSelected ? `url(#${selectedFill})` : tokens.color.chart.muted} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export { ComparisonChartCard };

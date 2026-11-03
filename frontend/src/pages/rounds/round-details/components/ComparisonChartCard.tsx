import { useId, type ReactNode } from "react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/brand";
import { chartColors, chartLayout, chartTickStyle, chartTooltipStyle, colors } from "@/brand/theme";
import { pluralize } from "@/domain/format";

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

function formatNumber(value: number | null): string {
  if (value == null) return "—";
  return Number.isInteger(value) ? `${value}` : value.toFixed(1);
}

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
  const selectedFill = `selectedBarGrad${useId().replace(/:/g, "")}`;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          <span className="font-bold text-primary">{formatNumber(bars[0]?.value ?? null)}</span>
          {" "}{primaryLabel} this round
        </CardDescription>
      </CardHeader>
      <CardContent className="h-chart">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={chartLayout.margin}>
            <defs>
              <linearGradient id={selectedFill} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={chartColors.accent} stopOpacity={1} />
                <stop offset="100%" stopColor={colors.primary} stopOpacity={1} />
              </linearGradient>
            </defs>
            <XAxis dataKey="label" tick={{ ...chartTickStyle, fill: chartColors.axis }} tickLine={false} axisLine={false} />
            <YAxis tick={{ ...chartTickStyle, fill: chartColors.axis }} tickLine={false} axisLine={false} />
            <Tooltip
              formatter={((v: number, _name: string, props: { payload: { sampleSize: number } }) => [
                formatNumber(v),
                `${primaryLabel} (${pluralize(props.payload.sampleSize, "round")})`,
              ]) as Fmt}
              contentStyle={chartTooltipStyle}
            />
            <Bar dataKey="value" radius={chartLayout.barRadius} isAnimationActive={false}>
              {chartData.map((d) => (
                <Cell key={d.label} fill={d.isSelected ? `url(#${selectedFill})` : chartColors.muted} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export { ComparisonChartCard };

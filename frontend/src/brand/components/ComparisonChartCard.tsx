import { useId, type ReactNode } from "react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { cn } from "@/brand/cn";
import { chartColors, chartTooltipStyle, colors } from "@/brand/theme";
import { pluralize } from "@/lib/pluralize";

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
    <div
      data-slot="comparison-chart-card"
      className={cn(
        "rounded-2xl border border-border bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card",
        className,
      )}
    >
      <div className="mb-1 text-sm font-bold text-card-foreground">{title}</div>
      <div className="mb-3 text-xs text-muted-foreground">
        <span className="font-bold text-primary">{formatNumber(bars[0]?.value ?? null)}</span>
        {" "}{primaryLabel} this round
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id={selectedFill} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={chartColors.accent} stopOpacity={1} />
              <stop offset="100%" stopColor={colors.primary} stopOpacity={1} />
            </linearGradient>
          </defs>
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: chartColors.axis }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 11, fill: chartColors.axis }} tickLine={false} axisLine={false} />
          <Tooltip
            formatter={((v: number, _name: string, props: { payload: { sampleSize: number } }) => [
              formatNumber(v),
              `${primaryLabel} (${pluralize(props.payload.sampleSize, "round")})`,
            ]) as Fmt}
            contentStyle={chartTooltipStyle}
          />
          {/* Recharts grows bars with CSS; Playwright's screenshot pass freezes that at height 0. */}
          <Bar dataKey="value" radius={[6, 6, 0, 0]} isAnimationActive={false}>
            {chartData.map((d) => (
              <Cell key={d.label} fill={d.isSelected ? `url(#${selectedFill})` : chartColors.muted} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export { ComparisonChartCard };

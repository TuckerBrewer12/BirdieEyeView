import { scaleLinear } from "d3-scale";
import { line } from "d3-shape";
import { cn } from "@/brand/cn";
import { tokens } from "@/brand/theme";
import { indexScale, knownValues, lastKnownIndex } from "./scales";

type StatTrendTone = "good" | "bad";

const STROKE: Record<StatTrendTone, string> = {
  good: tokens.color.status.success.text,
  bad: tokens.color.status.danger.text,
};

interface StatTrendProps {
  /** One value per round, oldest first. Null leaves a gap. */
  values: (number | null)[];
  /** Whether the change is for the better (green) or the worse (red). */
  tone?: StatTrendTone;
  className?: string;
}

/**
 * The little line on a `StatCard`: straight segments, no axes, the latest
 * round marked. It fills the span of its own values, so it shows shape, not level.
 */
export function StatTrend({ values, tone = "good", className }: StatTrendProps) {
  const { width: W, height: H, pad, stroke, dot } = tokens.chart.statTrend;
  const known = knownValues(values);
  if (values.length < 2 || known.length < 2) return null;

  const x = indexScale(values.length, pad, W - pad);
  const y = scaleLinear()
    .domain([Math.min(...known), Math.max(...known)])
    .range([H - pad - 1, pad + 1]);
  const trace = line<number | null>()
    .defined((v) => v != null)
    .x((_, i) => x(i))
    .y((v) => y(v!));
  const end = lastKnownIndex(values);
  const color = STROKE[tone];

  return (
    <svg
      data-slot="stat-trend"
      data-tone={tone}
      viewBox={`0 0 ${W} ${H}`}
      className={cn("block h-8 w-24 shrink-0", className)}
      aria-hidden
    >
      <path
        d={trace(values) ?? ""}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={x(end)} cy={y(values[end]!)} r={dot} fill={color} />
    </svg>
  );
}

export type { StatTrendTone };

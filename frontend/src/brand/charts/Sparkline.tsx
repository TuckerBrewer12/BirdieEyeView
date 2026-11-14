import { useId } from "react";
import { scaleLinear } from "d3-scale";
import { area, curveMonotoneX, line } from "d3-shape";
import { cn } from "@/brand/cn";
import { tokens } from "@/brand/theme";
import { indexScale, knownValues, lastKnownIndex, paddedExtent } from "./scales";

type SparklineTone = "primary" | "contrast" | "good" | "bad" | "index";

const STROKE: Record<SparklineTone, string> = {
  primary: tokens.color.primary,
  contrast: tokens.color.score.triple.text,
  good: tokens.color.primary,
  bad: tokens.color.score.bogey.text,
  index: tokens.color.chart.series2,
};

const SWATCH: Record<SparklineTone, string> = {
  primary: "bg-primary",
  contrast: "bg-score-triple",
  good: "bg-primary",
  bad: "bg-score-bogey",
  index: "bg-chart-series2",
};

interface SparklineSeries {
  values: (number | null)[];
  tone?: SparklineTone;
  label?: string;
}

interface SparklineProps {
  series: SparklineSeries[];
  domain?: [number, number];
  fill?: boolean;
  reference?: number | null;
  size?: "default" | "compact" | "card" | "mini";
  className?: string;
}

const OWN_WIDTH = { card: "w-sparkline-card", mini: "w-sparkline-mini shrink-0" } as const;

export function Sparkline({
  series,
  domain,
  fill = false,
  reference = null,
  size = "default",
  className,
}: SparklineProps) {
  const gradientId = `sparkline-${useId().replace(/:/g, "")}`;
  const { sparkline } = tokens.chart;
  const { width: W, height: H } = size === "default" ? sparkline : sparkline[size];
  const own = size === "card" || size === "mini" ? sparkline[size] : null;
  const filled = own != null;
  const pad = own?.pad ?? sparkline.pad;
  const dot = own?.dot ?? sparkline.dot;
  const stroke = own?.stroke ?? sparkline.stroke;

  const length = Math.max(0, ...series.map((s) => s.values.length));
  const all = series.flatMap((s) => s.values);
  if (length < 2 || knownValues(all).length < 2) return null;

  const x = indexScale(length, pad, W - pad);
  const y = scaleLinear()
    .domain(domain ?? paddedExtent(all, { ratio: 0.15 })!)
    .range([H - pad, pad])
    .clamp(true);

  const trace = line<number | null>()
    .defined((v) => v != null)
    .x((_, i) => x(i))
    .y((v) => y(v!))
    .curve(curveMonotoneX);

  const first = series[0].values;
  const referenceY = reference != null ? y(reference) : null;
  const shade = area<number | null>()
    .defined((v) => v != null)
    .x((_, i) => x(i))
    .y0(H - pad)
    .y1((v) => y(v!))
    .curve(curveMonotoneX);

  const labelled = series.filter((s) => s.label);

  return (
    <div
      data-slot="sparkline"
      className={cn("flex flex-col gap-1.5", (size === "card" || size === "mini") && OWN_WIDTH[size], className)}
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full overflow-visible" aria-hidden>
        {fill && (
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={STROKE[series[0].tone ?? "primary"]} stopOpacity={tokens.opacity.wash} />
              <stop offset="100%" stopColor={STROKE[series[0].tone ?? "primary"]} stopOpacity={0} />
            </linearGradient>
          </defs>
        )}
        {referenceY != null && (
          <line
            x1={pad}
            x2={W - pad}
            y1={referenceY}
            y2={referenceY}
            stroke={tokens.color.border}
            strokeWidth={tokens.lineWidth.border}
            strokeDasharray={tokens.chart.guideDash}
          />
        )}
        {fill && <path d={shade(first) ?? ""} fill={`url(#${gradientId})`} stroke="none" />}
        {series.map((s, i) => {
          const color = STROKE[s.tone ?? "primary"];
          const end = lastKnownIndex(s.values);
          const endValue = end >= 0 ? s.values[end] : null;
          return (
            <g key={i}>
              <path
                d={trace(s.values) ?? ""}
                fill="none"
                stroke={color}
                strokeWidth={stroke}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {endValue != null && dot > 0 && (
                <circle
                  cx={x(end)}
                  cy={y(endValue)}
                  r={dot}
                  fill={filled ? color : tokens.color.card}
                  stroke={filled ? "none" : color}
                  strokeWidth={filled ? 0 : stroke}
                />
              )}
            </g>
          );
        })}
      </svg>
      {labelled.length > 0 && (
        <div className="flex items-center gap-3">
          {labelled.map((s) => (
            <span key={s.label} className="flex items-center gap-1 text-caption text-muted-foreground">
              <span className={cn("size-2 rounded-full", SWATCH[s.tone ?? "primary"])} />
              {s.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export type { SparklineSeries, SparklineTone };

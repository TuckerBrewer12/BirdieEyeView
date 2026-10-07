import { useId } from "react";
import { scaleLinear } from "d3-scale";
import { area, curveMonotoneX, line } from "d3-shape";
import { cn } from "@/brand/cn";
import { borderWidth, chartLayout, colors, opacityWash, space } from "@/brand/theme";
import { indexScale, knownValues, lastKnownIndex, paddedExtent } from "./scales";

type SparklineTone = "primary" | "contrast";

const STROKE: Record<SparklineTone, string> = {
  primary: colors.primary,
  contrast: colors.score.triple.text,
};

const SWATCH: Record<SparklineTone, string> = {
  primary: "bg-primary",
  contrast: "bg-score-triple",
};

interface SparklineSeries {
  /** One value per round, oldest first. Null leaves a gap. */
  values: (number | null)[];
  tone?: SparklineTone;
  /** Shown in a legend under the line once any series has one. */
  label?: string;
}

interface SparklineProps {
  series: SparklineSeries[];
  /** The value range to draw against. Defaults to the data's own range, padded. */
  domain?: [number, number];
  /** Shade under the first series. */
  fill?: boolean;
  /** A dashed line at the first series' mean. */
  mean?: boolean;
  className?: string;
}

/** Which way a figure has been heading: a small line, no axes, the latest value marked. */
export function Sparkline({ series, domain, fill = false, mean = false, className }: SparklineProps) {
  const gradientId = `sparkline-${useId().replace(/:/g, "")}`;
  const { width: W, height: H, pad, stroke, dot } = chartLayout.sparkline;

  const length = Math.max(0, ...series.map((s) => s.values.length));
  const all = series.flatMap((s) => s.values);
  if (length < 2 || knownValues(all).length < 2) return null;

  // 15% headroom either side keeps the line off the edge.
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
  const firstKnown = knownValues(first);
  const meanY = firstKnown.length
    ? y(firstKnown.reduce((sum, v) => sum + v, 0) / firstKnown.length)
    : null;
  const shade = area<number | null>()
    .defined((v) => v != null)
    .x((_, i) => x(i))
    .y0(H - pad)
    .y1((v) => y(v!))
    .curve(curveMonotoneX);

  const labelled = series.filter((s) => s.label);

  return (
    <div data-slot="sparkline" className={cn("flex flex-col gap-1.5", className)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full overflow-visible" aria-hidden>
        {fill && (
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={STROKE[series[0].tone ?? "primary"]} stopOpacity={opacityWash} />
              <stop offset="100%" stopColor={STROKE[series[0].tone ?? "primary"]} stopOpacity={0} />
            </linearGradient>
          </defs>
        )}
        {mean && meanY != null && (
          <line
            x1={pad}
            x2={W - pad}
            y1={meanY}
            y2={meanY}
            stroke={colors.border}
            strokeWidth={borderWidth}
            strokeDasharray={`${space.dot} ${space.dot}`}
          />
        )}
        {fill && <path d={shade(first) ?? ""} fill={`url(#${gradientId})`} stroke="none" />}
        {series.map((s, i) => {
          const color = STROKE[s.tone ?? "primary"];
          const end = lastKnownIndex(s.values);
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
              {end >= 0 && (
                <circle
                  cx={x(end)}
                  cy={y(s.values[end]!)}
                  r={dot}
                  fill={colors.card}
                  stroke={color}
                  strokeWidth={stroke}
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

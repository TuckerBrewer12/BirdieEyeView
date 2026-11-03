import { useId } from "react";
import { scaleLinear } from "d3-scale";
import { area, curveMonotoneX, line } from "d3-shape";
import { cn } from "@/brand/cn";
import { color, tokens, type ColorName } from "@/brand/theme";
import { indexScale, knownValues, lastKnownIndex, paddedExtent } from "./scales";

type SparklineTone = "primary" | "contrast";

/** Each tone's colour, for the gradient under the line, and its classes for the line and legend. */
const TONE: Record<SparklineTone, { color: ColorName; stroke: string; swatch: string }> = {
  primary: { color: "primary", stroke: "stroke-primary", swatch: "bg-primary" },
  contrast: { color: "score-triple-text", stroke: "stroke-score-triple", swatch: "bg-score-triple" },
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
  /** A dashed line at this value: the average the server worked out for the line. None without it. */
  reference?: number | null;
  className?: string;
}

/** Which way a figure has been heading: a small line, no axes, the latest value marked. */
export function Sparkline({ series, domain, fill = false, reference = null, className }: SparklineProps) {
  const gradientId = `sparkline-${useId().replace(/:/g, "")}`;
  const { width: W, height: H, pad, stroke, dot } = tokens.chart.sparkline;

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
  const referenceY = reference != null ? y(reference) : null;
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
              <stop offset="0%" stopColor={color(TONE[series[0].tone ?? "primary"].color)} stopOpacity={tokens.opacity.wash} />
              <stop offset="100%" stopColor={color(TONE[series[0].tone ?? "primary"].color)} stopOpacity={0} />
            </linearGradient>
          </defs>
        )}
        {referenceY != null && (
          <line
            x1={pad}
            x2={W - pad}
            y1={referenceY}
            y2={referenceY}
            className="stroke-border"
            strokeWidth={tokens.lineWidth.border}
            strokeDasharray={`${tokens.space.dot} ${tokens.space.dot}`}
          />
        )}
        {fill && <path d={shade(first) ?? ""} fill={`url(#${gradientId})`} stroke="none" />}
        {series.map((s, i) => {
          const toneStroke = TONE[s.tone ?? "primary"].stroke;
          const end = lastKnownIndex(s.values);
          return (
            <g key={i}>
              <path
                d={trace(s.values) ?? ""}
                fill="none"
                className={toneStroke}
                strokeWidth={stroke}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {end >= 0 && (
                <circle
                  cx={x(end)}
                  cy={y(s.values[end]!)}
                  r={dot}
                  className={cn("fill-card", toneStroke)}
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
              <span className={cn("size-2 rounded-full", TONE[s.tone ?? "primary"].swatch)} />
              {s.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export type { SparklineSeries, SparklineTone };

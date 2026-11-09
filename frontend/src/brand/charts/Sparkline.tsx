import { useId } from "react";
import { scaleLinear } from "d3-scale";
import { area, curveMonotoneX, line } from "d3-shape";
import { cn } from "@/brand/cn";
import { tokens } from "@/brand/theme";
import { indexScale, knownValues, lastKnownIndex, paddedExtent } from "./scales";

/** `good` and `bad` carry the server's verdict on the move the line shows; `index` is the handicap's blue. */
type SparklineTone = "primary" | "contrast" | "good" | "bad" | "index";

const STROKE: Record<SparklineTone, string> = {
  primary: tokens.color.primary,
  contrast: tokens.color.score.triple.text,
  // A good move is the brand's green, as StatDelta draws the verdict beside it.
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
  /**
   * `compact` is the squatter 96 x 32 box beside a KPI tile's figure; `card` the flat 150 x 30
   * line under a card's lead figure, with no end dot; `mini` the 44 x 30 one beside a figure in a
   * phone's header card, its end dot filled. Each is drawn at its own size so its stroke holds.
   */
  size?: "default" | "compact" | "card" | "mini";
  className?: string;
}

// The card and mini lines are drawn at the size they show, so they keep it rather than fill the row.
const OWN_WIDTH = { card: "w-sparkline-card", mini: "w-sparkline-mini shrink-0" } as const;

/** Which way a figure has been heading: a small line, no axes, the latest value marked. */
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
  // The card and mini lines sit on a card with no rim to clear, so a dot they draw is filled.
  const own = size === "card" || size === "mini" ? sparkline[size] : null;
  const filled = own != null;
  const pad = own?.pad ?? sparkline.pad;
  const dot = own?.dot ?? sparkline.dot;
  const stroke = own?.stroke ?? sparkline.stroke;

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

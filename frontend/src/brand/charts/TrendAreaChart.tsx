import { useId, useState, type PointerEvent, type ReactNode } from "react";
import { scaleLinear } from "d3-scale";
import { area, curveLinear, curveMonotoneX, line } from "d3-shape";
import { cn } from "@/brand/cn";
import { scoreMarkFill, tokens } from "@/brand/theme";
import type { ScoreKind } from "@/domain/score";
import { ChartTooltip } from "./ChartTooltip";
import { useChartWidth } from "./useChartWidth";
import { indexScale, knownValues, paddedExtent } from "./scales";

type TrendAreaTone = "primary" | "birdie" | "bogey" | "eagle" | "neutral" | "contrast";

const STROKE: Record<TrendAreaTone, string> = {
  primary: tokens.color.primary,
  birdie: tokens.color.score.birdie.base,
  bogey: tokens.color.score.bogey.base,
  eagle: tokens.color.score.eagle.base,
  neutral: tokens.color.mutedForeground,
  contrast: tokens.color.score.triple.text,
};

// Spelled out in full so Tailwind finds every class when it scans the source.
const SWATCH: Record<TrendAreaTone, string> = {
  primary: "bg-primary",
  birdie: "bg-score-birdie-base",
  bogey: "bg-score-bogey-base",
  eagle: "bg-score-eagle-base",
  neutral: "bg-muted-foreground",
  contrast: "bg-score-triple",
};

interface TrendAreaSeries {
  /** Names the line in the tooltip, and in a legend when there are two. */
  label: string;
  tone?: TrendAreaTone;
  /** `dots` marks each round alone, with no line or fill: the scores under their running average. */
  mark?: "line" | "dots";
}

interface TrendAreaPoint {
  /** Under the point on the bottom axis: the round number. */
  tick: string | number;
  /** The tooltip's heading: "Round 12". */
  title: string;
  /** A quieter line under the heading, like the course. */
  subtitle?: string | null;
  /** One value per series, in the same order. Null leaves a gap. */
  values: (number | null)[];
  /** More figures for the tooltip, under the series values. */
  notes?: { label: string; value: string }[];
}

/** How many holes of one kind each round had, drawn on its own scale at the right. */
interface TrendAreaCount {
  kind: ScoreKind;
  /** "Birdies", in the tooltip. */
  label: string;
  /** One per point, in the same order. Null leaves a gap. */
  values: (number | null)[];
}

interface TrendAreaChartProps {
  /** One per round, oldest first. */
  points: TrendAreaPoint[];
  /**
   * The first is the figure, drawn over a soft fill, or as dots alone; a second is drawn beside it, a
   * thinner line beside a line, the lead line beside dots.
   */
  series: [TrendAreaSeries] | [TrendAreaSeries, TrendAreaSeries];
  /** How a value reads on the axis and in the tooltip. */
  format?: (value: number) => string;
  /** The value range to draw against. Defaults to the values' own range, padded. */
  domain?: [number, number];
  /** A dashed line across at a value worth measuring against: the average, par. */
  reference?: { value: number; label: string } | null;
  /**
   * Holes of a kind each round, each a thin line in its score colour against a count axis on the
   * right, from none: birdies, doubles. The main figure keeps its own scale on the left.
   */
  counts?: readonly TrendAreaCount[];
  /**
   * False hides the series, its axis and the reference, leaving the counts on their own: the score
   * turned off. With nothing left to draw, the chart says `offLabel`.
   */
  showSeries?: boolean;
  offLabel?: string;
  className?: string;
  "aria-label"?: string;
}

/**
 * A figure over a golfer's rounds: one line over a soft fill, oldest on the left, with a second
 * line beside it if wanted, or each round as a dot under its average's line. It draws at its box's
 * width, so its labels keep their size. Hovering with a mouse or tapping on a phone picks a round
 * and shows its figures.
 */
export function TrendAreaChart({
  points,
  series,
  format = String,
  domain,
  reference,
  counts = [],
  showSeries = true,
  offLabel = "Nothing turned on",
  className,
  "aria-label": ariaLabel,
}: TrendAreaChartProps) {
  const layout = tokens.chart.trendArea;
  const { height: H, pad: PAD } = layout;
  const [W, measureRef] = useChartWidth(layout.width, layout.minWidth);
  const gradientId = `trend-area-${useId().replace(/:/g, "")}`;
  const [active, setActive] = useState<number | null>(null);

  const first = points.map((point) => point.values[0] ?? null);
  const nothingOn = !showSeries && counts.length === 0;
  if (nothingOn || points.length < 2 || knownValues(first).length < 2) {
    return (
      <div
        data-slot="trend-area-chart"
        className="flex h-chart items-center justify-center text-sm text-muted-foreground"
      >
        {nothingOn ? offLabel : "Not enough data"}
      </div>
    );
  }

  const all = points.flatMap((point) => point.values);
  const extent = domain ?? paddedExtent([...all, reference?.value], { ratio: layout.headroom })!;
  // The counts' axis takes room on the right.
  const right = W - PAD.right - (counts.length > 0 ? layout.countAxis : 0);
  const x = indexScale(points.length, PAD.left, right);
  const y = scaleLinear()
    .domain(extent)
    .range([H - PAD.bottom, PAD.top]);
  const baseline = H - PAD.bottom;
  const countMax = Math.max(layout.countFloor, ...counts.flatMap((count) => knownValues(count.values)));
  const yCount = scaleLinear().domain([0, countMax]).nice().range([baseline, PAD.top]);
  const countTicks = yCount.ticks(layout.yTicks).filter((tick) => Number.isInteger(tick));

  const valuesOf = (i: number) => points.map((point) => point.values[i] ?? null);
  const countTrace = line<number | null>()
    .defined((v) => v != null)
    .x((_, i) => x(i))
    .y((v) => yCount(v!))
    .curve(curveLinear);
  const trace = line<number | null>()
    .defined((v) => v != null)
    .x((_, i) => x(i))
    .y((v) => y(v!))
    .curve(curveMonotoneX);
  const shade = area<number | null>()
    .defined((v) => v != null)
    .x((_, i) => x(i))
    .y0(baseline)
    .y1((v) => y(v!))
    .curve(curveMonotoneX);

  const lead = STROKE[series[0].tone ?? "primary"];
  // The line drawn full weight: the first, unless the first is dots.
  const leadLine = series.findIndex((s) => s.mark !== "dots");
  const hasDots = series.some((s) => s.mark === "dots");
  const showDots = points.length <= layout.maxDots;
  const xTicks = tickIndexes(points.length, layout.xTicks);

  const indexAt = (event: PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const index = Math.round(x.invert((event.clientX - rect.left) * (W / rect.width)));
    return Math.max(0, Math.min(points.length - 1, index));
  };

  const point = active != null ? points[active] : null;
  // The hover card sits by the round's figure, or its first count with the series hidden.
  const pointValue = showSeries ? point?.values.find((value) => value != null) ?? null : null;
  const countValue =
    active != null ? counts.map((count) => count.values[active]).find((value) => value != null) ?? null : null;
  const pointY = pointValue != null ? y(pointValue) : countValue != null ? yCount(countValue) : null;

  return (
    <div
      ref={measureRef}
      data-slot="trend-area-chart"
      className={cn("relative flex flex-col gap-2 select-none", className)}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block h-auto w-full touch-pan-y overflow-visible"
        role="img"
        aria-label={ariaLabel}
        onPointerMove={(event) => {
          if (event.pointerType === "mouse") setActive(indexAt(event));
        }}
        onPointerLeave={(event) => {
          if (event.pointerType === "mouse") setActive(null);
        }}
        onPointerDown={(event) => {
          if (event.pointerType === "mouse") return;
          // A tap picks a round and a second tap on it puts it down.
          const index = indexAt(event);
          setActive(active === index ? null : index);
        }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lead} stopOpacity={tokens.opacity.wash} />
            <stop offset="100%" stopColor={lead} stopOpacity={0} />
          </linearGradient>
        </defs>

        {/* With the series hidden, the rules follow the counts' axis. */}
        {!showSeries &&
          countTicks.map((tick) => (
            <line
              key={`rule-${tick}`}
              x1={PAD.left}
              x2={right}
              y1={yCount(tick)}
              y2={yCount(tick)}
              stroke={tokens.color.chart.muted}
              strokeWidth={tokens.lineWidth.border}
            />
          ))}

        {showSeries &&
          y.ticks(layout.yTicks).map((tick) => (
            <g key={`y-${tick}`}>
              <line
                x1={PAD.left}
                x2={right}
                y1={y(tick)}
                y2={y(tick)}
                stroke={tokens.color.chart.muted}
                strokeWidth={tokens.lineWidth.border}
              />
              <AxisLabel x={PAD.left - 8} y={y(tick) + 4} anchor="end">
                {format(tick)}
              </AxisLabel>
            </g>
          ))}

        {counts.length > 0 &&
          countTicks.map((tick) => (
            <AxisLabel key={`count-${tick}`} x={right + 8} y={yCount(tick) + 4} anchor="start">
              {tick}
            </AxisLabel>
          ))}

        {xTicks.map((i) => (
          <AxisLabel key={`x-${i}`} x={x(i)} y={baseline + 16} anchor="middle">
            {points[i].tick}
          </AxisLabel>
        ))}

        {showSeries && reference && (
          <g data-slot="trend-area-reference">
            <line
              x1={PAD.left}
              x2={right}
              y1={y(reference.value)}
              y2={y(reference.value)}
              stroke={tokens.color.chart.axis}
              strokeWidth={tokens.lineWidth.border}
              strokeDasharray={tokens.chart.guideDash}
            />
            <AxisLabel x={right} y={y(reference.value) - 6} anchor="end">
              {reference.label}
            </AxisLabel>
          </g>
        )}

        {showSeries && series[0].mark !== "dots" && (
          <path d={shade(first) ?? ""} fill={`url(#${gradientId})`} stroke="none" />
        )}

        {showSeries &&
          series.map((s, i) =>
            s.mark === "dots" ? null : (
              <path
                key={s.label}
                d={trace(valuesOf(i)) ?? ""}
                fill="none"
                stroke={STROKE[s.tone ?? "primary"]}
                strokeWidth={i === leadLine ? layout.stroke : layout.strokeSecondary}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )
          )}

        {counts.map((count) => (
          <g key={`count-${count.kind}`} data-slot="trend-area-count">
            <path
              d={countTrace(count.values) ?? ""}
              fill="none"
              stroke={scoreMarkFill(count.kind)}
              strokeWidth={layout.strokeSecondary}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {count.values.map((value, index) =>
              value == null || (!showDots && active !== index) ? null : (
                <circle
                  key={index}
                  cx={x(index)}
                  cy={yCount(value)}
                  r={active === index ? layout.dotHover : layout.dot}
                  fill={scoreMarkFill(count.kind)}
                  stroke={tokens.color.card}
                  strokeWidth={tokens.lineWidth.outline}
                />
              )
            )}
          </g>
        ))}

        {active != null && pointY != null && (
          <line
            x1={x(active)}
            x2={x(active)}
            y1={PAD.top}
            y2={baseline}
            stroke={tokens.color.chart.muted}
            strokeWidth={tokens.lineWidth.border}
            strokeDasharray={tokens.chart.guideDash}
          />
        )}

        {showSeries &&
          series.map((s, i) =>
            points.map((p, index) => {
              const value = p.values[i];
              const dotted = s.mark === "dots";
              // Beside the rounds' own dots, a line marks only the round picked.
              const lineDots = showDots && !hasDots;
              if (value == null || (!dotted && !lineDots && active !== index)) return null;
              return (
                <circle
                  key={`dot-${i}-${index}`}
                  cx={x(index)}
                  cy={y(value)}
                  r={active === index ? layout.dotHover : layout.dot}
                  fill={dotted && active !== index ? tokens.color.chart.axis : STROKE[s.tone ?? "primary"]}
                  stroke={tokens.color.card}
                  strokeWidth={tokens.lineWidth.outline}
                />
              );
            })
          )}
      </svg>

      {showSeries && series.length > 1 && (
        <div className="flex items-center justify-center gap-4">
          {series.map((s) => (
            <span key={s.label} className="flex items-center gap-1.5 text-caption text-muted-foreground">
              <span className={cn("size-2 rounded-full", SWATCH[s.tone ?? "primary"])} />
              {s.label}
            </span>
          ))}
        </div>
      )}

      <ChartTooltip
        id={point && active != null && pointY != null ? active : null}
        at={{ x: x(active ?? 0) / W, y: (pointY ?? 0) / H }}
        className="min-w-32"
      >
        {point && active != null && pointY != null && (
          <>
            <div className="text-sm font-bold text-card-foreground">{point.title}</div>
            {point.subtitle && (
              <div className="max-w-40 truncate text-label text-muted-foreground">{point.subtitle}</div>
            )}
            <div className="mt-1.5 flex flex-col gap-0.5">
              {showSeries &&
                series.map((s, i) => {
                  const value = point.values[i];
                  return (
                    <TooltipRow key={s.label} label={s.label}>
                      {value != null ? format(value) : "—"}
                    </TooltipRow>
                  );
                })}
              {counts.map((count) => {
                const value = count.values[active];
                return (
                  <TooltipRow key={count.kind} label={count.label}>
                    {value != null ? value : "—"}
                  </TooltipRow>
                );
              })}
              {point.notes?.map((note) => (
                <TooltipRow key={note.label} label={note.label}>
                  {note.value}
                </TooltipRow>
              ))}
            </div>
          </>
        )}
      </ChartTooltip>
    </div>
  );
}

function TooltipRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold text-card-foreground tabular-nums">{children}</span>
    </div>
  );
}

function AxisLabel({
  x,
  y,
  anchor,
  children,
}: {
  x: number;
  y: number;
  anchor: "start" | "middle" | "end";
  children: ReactNode;
}) {
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      fontSize={tokens.type.label.size}
      fontWeight="600"
      fontFamily={tokens.font.sans}
      fill={tokens.color.chart.axis}
      paintOrder="stroke"
      stroke={tokens.color.card}
      strokeWidth={tokens.lineWidth.ring}
      strokeLinejoin="round"
    >
      {children}
    </text>
  );
}

/** About `count` evenly spaced indexes from the first, always ending on the last. */
function tickIndexes(length: number, count: number): number[] {
  const step = Math.max(1, Math.ceil((length - 1) / (count - 1)));
  const ticks = Array.from({ length: Math.ceil(length / step) }, (_, i) => i * step).filter((i) => i < length);
  // Drop a tick that would crowd the last one.
  if (ticks.length > 1 && length - 1 - ticks[ticks.length - 1] < step / 2) ticks.pop();
  if (ticks[ticks.length - 1] !== length - 1) ticks.push(length - 1);
  return ticks;
}

export type { TrendAreaChartProps, TrendAreaCount, TrendAreaPoint, TrendAreaSeries, TrendAreaTone };

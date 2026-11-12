import { useId, useState, type PointerEvent } from "react";
import { scaleLinear } from "d3-scale";
import { area, curveLinear, curveMonotoneX, line } from "d3-shape";
import { cn } from "@/brand/cn";
import { Slider } from "@/brand/components/Slider";
import { scoreMarkFill, tokens } from "@/brand/theme";
import { pluralize } from "@/domain/format";
import type { ScoreKind } from "@/domain/score";
import { ChartTooltip } from "./ChartTooltip";
import { AxisLabel, TooltipRow } from "./trendParts";
import { useChartWidth } from "./useChartWidth";
import { indexScale, knownValues, paddedExtent, tickIndexes } from "./scales";

type TrendAreaTone = "primary" | "birdie" | "bogey" | "eagle" | "neutral" | "contrast";

const STROKE: Record<TrendAreaTone, string> = {
  primary: tokens.color.primary,
  birdie: tokens.color.score.birdie.base,
  bogey: tokens.color.score.bogey.base,
  eagle: tokens.color.score.eagle.base,
  neutral: tokens.color.chart.axis,
  contrast: tokens.color.score.triple.text,
};

// Spelled out in full so Tailwind finds every class when it scans the source.
const SWATCH: Record<TrendAreaTone, string> = {
  primary: "bg-primary",
  birdie: "bg-score-birdie-base",
  bogey: "bg-score-bogey-base",
  eagle: "bg-score-eagle-base",
  neutral: "bg-foreground-secondary",
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

/** How many holes of one kind each round had, drawn in a panel of its own under the series. */
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
   * Holes of a kind each round: a panel under the series, its own count axis from none, each kind a
   * line in its score colour. Two scales never share one plot.
   */
  counts?: readonly TrendAreaCount[];
  /** False hides the series and its panel, leaving the counts. With nothing left, the chart says `offLabel`. */
  showSeries?: boolean;
  offLabel?: string;
  /** A slider under the chart picks how many of the latest rounds to show, all to start. */
  windowed?: boolean;
  className?: string;
  "aria-label"?: string;
}

/**
 * A figure over a golfer's rounds: one line over a soft fill, oldest on the left, with a second line
 * beside it if wanted, or each round as a dot under its average's line. Holes of a kind each round
 * draw in a panel below, on their own scale, sharing the rounds along the bottom. It draws at its
 * box's width, so its labels keep their size. Hovering with a mouse or tapping on a phone picks a
 * round and shows its figures.
 */
export function TrendAreaChart({
  points: allPoints,
  series,
  format = String,
  domain,
  reference,
  counts: allCounts = [],
  showSeries = true,
  offLabel = "Nothing turned on",
  windowed = false,
  className,
  "aria-label": ariaLabel,
}: TrendAreaChartProps) {
  const layout = tokens.chart.trendArea;
  const PAD = layout.pad;
  const [W, measureRef] = useChartWidth(layout.width, layout.minWidth);
  const gradientId = `trend-area-${useId().replace(/:/g, "")}`;
  const [active, setActive] = useState<number | null>(null);
  const [picked, setPicked] = useState<number | null>(null);

  // The window: the latest `shown` rounds, every one until the slider says otherwise.
  const canWindow = windowed && allPoints.length > layout.windowMin;
  const shown = canWindow ? Math.min(picked ?? allPoints.length, allPoints.length) : allPoints.length;
  const from = allPoints.length - shown;
  const points = allPoints.slice(from);
  const counts = allCounts.map((count) => ({ ...count, values: count.values.slice(from) }));

  const first = points.map((point) => point.values[0] ?? null);
  const nothingOn = !showSeries && counts.length === 0;
  if (nothingOn || points.length < 2 || knownValues(first).length < 2) {
    return (
      <div data-slot="trend-area-chart" className="flex h-chart items-center justify-center text-body text-muted-foreground">
        {nothingOn ? offLabel : "Not enough data"}
      </div>
    );
  }

  // One plot or two stacked: the series on top at full height, the counts under it, shorter.
  const plotH = layout.height - PAD.top - PAD.bottom;
  const seriesTop = PAD.top;
  const seriesBottom = showSeries ? seriesTop + plotH : seriesTop;
  const countsTop = showSeries ? seriesBottom + layout.panelGap : PAD.top;
  const countsBottom = counts.length === 0 ? countsTop : countsTop + (showSeries ? layout.countHeight : plotH);
  const baseline = counts.length > 0 ? countsBottom : seriesBottom;
  const H = baseline + PAD.bottom;

  const all = points.flatMap((point) => point.values);
  const extent = domain ?? paddedExtent(all, { ratio: layout.headroom })!;
  const x = indexScale(points.length, PAD.left, W - PAD.right);
  const y = scaleLinear().domain(extent).range([seriesBottom, seriesTop]);
  const countMax = Math.max(layout.countFloor, ...counts.flatMap((count) => knownValues(count.values)));
  const yCount = scaleLinear().domain([0, countMax]).nice().range([countsBottom, countsTop]);
  const countTicks = yCount.ticks(layout.countTicks).filter((tick) => Number.isInteger(tick));

  const valuesOf = (i: number) => points.map((point) => point.values[i] ?? null);
  const trace = line<number | null>()
    .defined((v) => v != null)
    .x((_, i) => x(i))
    .y((v) => y(v!))
    .curve(curveMonotoneX);
  const shade = area<number | null>()
    .defined((v) => v != null)
    .x((_, i) => x(i))
    .y0(seriesBottom)
    .y1((v) => y(v!))
    .curve(curveMonotoneX);
  const countTrace = line<number | null>()
    .defined((v) => v != null)
    .x((_, i) => x(i))
    .y((v) => yCount(v!))
    .curve(curveLinear);

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
  const pointValue = showSeries ? (point?.values.find((value) => value != null) ?? null) : null;
  const countValue = active != null ? (counts.map((count) => count.values[active]).find((v) => v != null) ?? null) : null;
  const pointY = pointValue != null ? y(pointValue) : countValue != null ? yCount(countValue) : null;

  return (
    <div ref={measureRef} data-slot="trend-area-chart" className={cn("relative flex flex-col gap-3 select-none", className)}>
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

        {showSeries &&
          y.ticks(layout.yTicks).map((tick) => (
            <g key={`y-${tick}`}>
              <Rule x1={PAD.left} x2={W - PAD.right} y={y(tick)} />
              <AxisLabel x={PAD.left - 8} y={y(tick) + 4} anchor="end">
                {format(tick)}
              </AxisLabel>
            </g>
          ))}

        {counts.length > 0 &&
          countTicks.map((tick) => (
            <g key={`count-${tick}`}>
              <Rule x1={PAD.left} x2={W - PAD.right} y={yCount(tick)} />
              <AxisLabel x={PAD.left - 8} y={yCount(tick) + 4} anchor="end">
                {tick}
              </AxisLabel>
            </g>
          ))}

        {xTicks.map((i) => (
          <AxisLabel key={`x-${i}`} x={x(i)} y={baseline + 18} anchor="middle">
            {points[i].tick}
          </AxisLabel>
        ))}

        {showSeries && reference && reference.value >= extent[0] && reference.value <= extent[1] && (
          <g data-slot="trend-area-reference">
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y(reference.value)}
              y2={y(reference.value)}
              stroke={tokens.color.chart.axis}
              strokeWidth={tokens.lineWidth.border}
              strokeDasharray={tokens.chart.guideDash}
            />
            <AxisLabel x={W - PAD.right} y={y(reference.value) - 6} anchor="end">
              {reference.label}
            </AxisLabel>
          </g>
        )}

        {showSeries && series[0].mark !== "dots" && <path d={shade(first) ?? ""} fill={`url(#${gradientId})`} stroke="none" />}

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
            ),
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
              ),
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
            }),
          )}
      </svg>

      {showSeries && series.length > 1 && (
        <div className="flex items-center justify-center gap-5">
          {series.map((s) => (
            <span key={s.label} className="flex items-center gap-2 text-body text-foreground-secondary">
              <span className={cn("size-2.5 rounded-full", SWATCH[s.tone ?? "primary"])} />
              {s.label}
            </span>
          ))}
        </div>
      )}

      {canWindow && (
        <Slider
          aria-label="Rounds shown"
          min={layout.windowMin}
          max={allPoints.length}
          value={shown}
          onValueChange={setPicked}
          valueLabel={shown === allPoints.length ? `All ${pluralize(shown, "round")}` : `Last ${shown} of ${allPoints.length}`}
        />
      )}

      <ChartTooltip
        id={point && active != null && pointY != null ? active : null}
        at={{ x: x(active ?? 0) / W, y: (pointY ?? 0) / H }}
        className="min-w-32"
      >
        {point && active != null && pointY != null && (
          <>
            <div className="text-sm font-bold text-card-foreground">{point.title}</div>
            {point.subtitle && <div className="max-w-40 truncate text-label text-muted-foreground">{point.subtitle}</div>}
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

/** A grid rule across a plot. */
function Rule({ x1, x2, y }: { x1: number; x2: number; y: number }) {
  return <line x1={x1} x2={x2} y1={y} y2={y} stroke={tokens.color.chart.muted} strokeWidth={tokens.lineWidth.border} />;
}

export type { TrendAreaChartProps, TrendAreaCount, TrendAreaPoint, TrendAreaSeries, TrendAreaTone };

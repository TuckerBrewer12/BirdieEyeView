import { useId } from "react";
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
import { usePointPick } from "./usePointPick";
import { indexScale, knownValues, niceExtent, tickIndexes } from "./scales";

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
  label: string;
  tone?: TrendAreaTone;
  mark?: "line" | "dots";
}

interface TrendAreaPoint {
  tick: string | number;
  title: string;
  subtitle?: string | null;
  values: (number | null)[];
  notes?: { label: string; value: string }[];
}

interface TrendAreaCount {
  kind: ScoreKind;
  label: string;
  values: (number | null)[];
}

interface TrendAreaChartProps {
  points: TrendAreaPoint[];
  series: [TrendAreaSeries] | [TrendAreaSeries, TrendAreaSeries];
  format?: (value: number) => string;
  domain?: [number, number];
  reference?: { value: number; label: string } | null;
  counts?: readonly TrendAreaCount[];
  showSeries?: boolean;
  offLabel?: string;
  shown?: number | null;
  onShownChange?: (shown: number) => void;
  className?: string;
  "aria-label"?: string;
}

export function TrendAreaChart({
  points: allPoints,
  series,
  format = String,
  domain,
  reference,
  counts: allCounts = [],
  showSeries = true,
  offLabel = "Nothing turned on",
  shown: pickedShown = null,
  onShownChange,
  className,
  "aria-label": ariaLabel,
}: TrendAreaChartProps) {
  const layout = tokens.chart.trendArea;
  const PAD = layout.pad;
  const [W, measureRef] = useChartWidth(layout.width, layout.minWidth);
  const gradientId = `trend-area-${useId().replace(/:/g, "")}`;
  const { active, track } = usePointPick();

  const canWindow = onShownChange != null && allPoints.length > layout.windowMin;
  const shown = canWindow ? Math.min(pickedShown ?? allPoints.length, allPoints.length) : allPoints.length;
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

  const plotH = layout.height - PAD.top - PAD.bottom;
  const seriesTop = PAD.top;
  const seriesBottom = showSeries ? seriesTop + plotH : seriesTop;
  const countsTop = showSeries ? seriesBottom + layout.panelGap : PAD.top;
  const countsBottom = counts.length === 0 ? countsTop : countsTop + (showSeries ? layout.countHeight : plotH);
  const baseline = counts.length > 0 ? countsBottom : seriesBottom;
  const H = baseline + PAD.bottom;

  const all = points.flatMap((point) => point.values);
  const extent = domain ?? niceExtent(all, layout.yTicks, layout.flatSpan)!;
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
  const leadLine = series.findIndex((s) => s.mark !== "dots");
  const hasDots = series.some((s) => s.mark === "dots");
  const showDots = points.length <= layout.maxDots;
  const xTicks = tickIndexes(points.length, layout.xTicks);

  const point = active != null ? points[active] : null;
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
        {...track(x, points.length, W)}
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
            points.map((p, index) => {
              const value = p.values[i];
              const dotted = s.mark === "dots";
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
                  r={active === index ? layout.countDotHover : layout.countDot}
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
          onValueChange={onShownChange}
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

function Rule({ x1, x2, y }: { x1: number; x2: number; y: number }) {
  return <line x1={x1} x2={x2} y1={y} y2={y} stroke={tokens.color.chart.muted} strokeWidth={tokens.lineWidth.border} />;
}

export type { TrendAreaChartProps, TrendAreaCount, TrendAreaPoint, TrendAreaSeries, TrendAreaTone };

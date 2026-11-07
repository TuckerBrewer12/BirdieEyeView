import { useId, type ReactNode } from "react";
import { scaleLinear } from "d3-scale";
import { area, curveMonotoneX, line } from "d3-shape";
import { cn } from "@/brand/cn";
import { ToParFigure } from "@/brand/components/ToParFigure";
import { toParFill, differentialFill, tokens } from "@/brand/theme";
import { formatHandicapIndex, type RoundTrendPoint } from "@/domain";
import { ChartTooltip } from "./ChartTooltip";
import { indexScale, knownValues, paddedExtent } from "./scales";
import { pointAnchor, useNearestPoint } from "./useNearestPoint";

type TrendSeries = "both" | "score" | "handicap";

interface SVGScoreHandicapTrendProps {
  data: RoundTrendPoint[];
  /** Which line to draw. `both` puts the handicap on a second axis at the right. */
  series?: TrendSeries;
  /** The phone shape: narrower and taller. Meant for one series at a time. */
  compact?: boolean;
}

const SCORE_COLOR = tokens.color.primary;
const HANDICAP_COLOR = tokens.color.score.double.text;

/**
 * Scores as bars under a line, the handicap index as a second line, or either
 * alone. Hovering with a mouse or tapping on a phone picks a round.
 */
export function SVGScoreHandicapTrend({ data, series = "both", compact = false }: SVGScoreHandicapTrendProps) {
  const plot = compact ? { ...tokens.chart.plot, ...tokens.chart.plotCompact } : tokens.chart.plot;
  const { width: W, height: H, pad: PAD } = plot;
  const hiGrad = `hiGrad${useId().replace(/:/g, "")}`;
  // A pick belongs to its series, so switching the line clears it.
  const { active, svgProps } = useNearestPoint(series);

  const showScore = series !== "handicap";
  const showHandicap = series !== "score";
  const scores = data.map((d) => d.score);
  const handicaps = data.map((d) => d.handicapIndex);

  if (data.length < 2) {
    return <EmptyTrend compact={compact}>Not enough data</EmptyTrend>;
  }
  if (showScore && knownValues(scores).length === 0) {
    return <EmptyTrend compact={compact}>No score data</EmptyTrend>;
  }
  if (series === "handicap" && knownValues(handicaps).length === 0) {
    return <EmptyTrend compact={compact}>No handicap yet</EmptyTrend>;
  }

  const x = indexScale(data.length, PAD.left, W - PAD.right);
  // Five strokes of headroom on the score axis, half a point on the handicap axis.
  const yScore = scaleLinear().domain(paddedExtent(scores, 5) ?? [60, 100]).range([H - PAD.bottom, PAD.top]);
  const yHandicap = scaleLinear()
    .domain(paddedExtent(handicaps, 0.5) ?? [-0.5, 10.5])
    .range([H - PAD.bottom, PAD.top]);
  // The left axis belongs to whichever line leads.
  const yLeft = showScore ? yScore : yHandicap;
  const hasHandicap = knownValues(handicaps).length > 0;

  const scorePath =
    line<number | null>()
      .defined((v) => v != null)
      .x((_, i) => x(i))
      .y((v) => yScore(v!))
      .curve(curveMonotoneX)(scores) ?? "";
  const handicapPath =
    line<number | null>()
      .defined((v) => v != null)
      .x((_, i) => x(i))
      .y((v) => yHandicap(v!))
      .curve(curveMonotoneX)(handicaps) ?? "";
  const handicapArea =
    area<number | null>()
      .defined((v) => v != null)
      .x((_, i) => x(i))
      .y0(H - PAD.bottom)
      .y1((v) => yHandicap(v!))
      .curve(curveMonotoneX)(handicaps) ?? "";

  const barW = Math.max(plot.barMin, Math.min(plot.barMax, (W - PAD.left - PAD.right) / data.length - plot.barGap));
  const baseline = H - PAD.bottom;
  const showLabels = showScore && !compact && data.length <= 15;
  const xTicks = compact ? xTickIndexes(data.length) : [];

  const xs = data.map((_, i) => x(i));
  const point = active != null ? data[active] : null;
  const pointValue = point ? (showScore ? point.score : point.handicapIndex) : null;
  const pointY = pointValue != null ? (showScore ? yScore(pointValue) : yHandicap(pointValue)) : null;
  const anchor = active != null && pointY != null ? pointAnchor(x(active), pointY, W, H) : null;

  return (
    <div data-slot="score-handicap-trend" className="relative select-none">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full touch-pan-y overflow-visible"
        {...svgProps(xs, W)}
      >
        <defs>
          <linearGradient id={hiGrad} x1="0" y1="0" x2="0" y2="1">
            <stop offset="10%" stopColor={HANDICAP_COLOR} stopOpacity={tokens.opacity.tint} />
            <stop offset="100%" stopColor={HANDICAP_COLOR} stopOpacity={0} />
          </linearGradient>
        </defs>

        {yLeft.ticks(5).map((v) => (
          <g key={`left-${v}`}>
            <line x1={PAD.left} x2={W - PAD.right} y1={yLeft(v)} y2={yLeft(v)} stroke={tokens.color.border} strokeWidth={tokens.lineWidth.border} />
            <AxisLabel x={PAD.left - 12} y={yLeft(v) + 4} anchor="end" color={tokens.color.chart.axis}>
              {showScore ? v : formatHandicapIndex(v)}
            </AxisLabel>
          </g>
        ))}

        <line x1={PAD.left} x2={W - PAD.right} y1={baseline} y2={baseline} stroke={tokens.color.chart.muted} strokeWidth={tokens.lineWidth.border} />

        {series === "both" &&
          hasHandicap &&
          yHandicap.ticks(4).map((v) => (
            <AxisLabel key={`right-${v}`} x={W - PAD.right + 12} y={yHandicap(v) + 4} anchor="start" color={HANDICAP_COLOR}>
              {formatHandicapIndex(v)}
            </AxisLabel>
          ))}

        {xTicks.map((i) => (
          <AxisLabel key={`x-${i}`} x={x(i)} y={baseline + 16} anchor="middle" color={tokens.color.chart.axis}>
            {i + 1}
          </AxisLabel>
        ))}

        {showScore &&
          data.map((d, i) => {
            if (d.score == null) return null;
            const top = yScore(d.score);
            if (baseline - top <= 0) return null;
            return (
              <rect
                key={`bar-${i}`}
                x={x(i) - barW / 2}
                y={top}
                width={barW}
                height={baseline - top}
                fill={differentialFill(d.differentialStatus)}
                fillOpacity={tokens.opacity.strong}
                rx={tokens.radius.tick}
              />
            );
          })}

        {showHandicap && hasHandicap && (
          <>
          <path d={handicapArea} fill={`url(#${hiGrad})`} stroke="none" />
          <path
            d={handicapPath}
            fill="none"
            stroke={HANDICAP_COLOR}
            strokeWidth={series === "both" ? tokens.lineWidth.outline : tokens.chart.sparkline.stroke}
            strokeOpacity={series === "both" ? 0.7 : 1}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          </>
        )}

        {showScore && (
          <path
            d={scorePath}
            fill="none"
            stroke={SCORE_COLOR}
            strokeWidth={tokens.chart.sparkline.stroke}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

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

        {data.map((d, i) => {
          const value = showScore ? d.score : d.handicapIndex;
          if (value == null) return null;
          return (
            <circle
              key={`dot-${i}`}
              cx={x(i)}
              cy={showScore ? yScore(value) : yHandicap(value)}
              r={active === i ? plot.dotHover : plot.dot}
              fill={showScore ? toParFill(d.toPar) : HANDICAP_COLOR}
              stroke={tokens.color.card}
              strokeWidth={tokens.lineWidth.outline}
            />
          );
        })}

        {showLabels &&
          data.map((d, i) =>
            d.score == null ? null : (
              <text
                key={`value-${i}`}
                x={x(i)}
                y={yScore(d.score) - 8}
                textAnchor="middle"
                fontSize={tokens.type.caption.size}
                fontFamily={tokens.font.sans}
                fill={tokens.color.chart.axis}
                fontWeight="600"
              >
                {d.score}
              </text>
            ),
          )}
      </svg>

      <ChartTooltip anchor={anchor} id={`${series}-${active}`}>
        {point && (
          <>
            <div className="mb-1 text-sm font-bold text-card-foreground">Round {point.roundIndex}</div>
            {point.courseName && (
              <div className="mb-1.5 max-w-40 truncate text-label text-muted-foreground">{point.courseName}</div>
            )}
            {showScore && point.score != null && (
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Score</span>
                <span className="flex items-baseline gap-1.5 font-semibold text-card-foreground">
                  {point.score}
                  <ToParFigure toPar={point.toPar} />
                </span>
              </div>
            )}
            {showHandicap && point.handicapIndex != null && (
              <div className="mt-0.5 flex items-center justify-between gap-3">
                <span className="text-muted-foreground">HI</span>
                <span className="font-semibold text-score-double">{formatHandicapIndex(point.handicapIndex)}</span>
              </div>
            )}
          </>
        )}
      </ChartTooltip>
    </div>
  );
}

function AxisLabel({
  x,
  y,
  anchor,
  color,
  children,
}: {
  x: number;
  y: number;
  anchor: "start" | "middle" | "end";
  color: string;
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
      fill={color}
      paintOrder="stroke"
      stroke={tokens.color.card}
      strokeWidth={tokens.lineWidth.ring}
      strokeLinejoin="round"
    >
      {children}
    </text>
  );
}

function EmptyTrend({ compact, children }: { compact: boolean; children: ReactNode }) {
  return (
    <div
      className={cn(
        "flex items-center justify-center text-sm text-muted-foreground",
        compact ? "h-chart-compact" : "h-chart",
      )}
    >
      {children}
    </div>
  );
}

/** About five round numbers along the bottom, evenly spaced from the first. */
function xTickIndexes(count: number): number[] {
  const step = Math.max(1, Math.floor((count - 1) / 4));
  return Array.from({ length: Math.ceil(count / step) }, (_, i) => i * step).filter((i) => i < count);
}

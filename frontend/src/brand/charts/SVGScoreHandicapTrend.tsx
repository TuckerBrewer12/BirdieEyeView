import { useState, type PointerEvent, type ReactNode } from "react";
import { scaleLinear } from "d3-scale";
import { curveStepAfter, line } from "d3-shape";
import { cn } from "@/brand/cn";
import { ToParFigure } from "@/brand/components/ToParFigure";
import { differentialFill, tokens } from "@/brand/theme";
import { formatHandicapIndex, type RoundTrendPoint } from "@/domain";
import { ChartTooltip } from "./ChartTooltip";
import { indexScale, knownValues, lastKnownIndex, niceExtent } from "./scales";

type TrendSeries = "both" | "score" | "handicap";

interface SVGScoreHandicapTrendProps {
  data: RoundTrendPoint[];
  /** Which panel to draw. `both` stacks the handicap index under the scores, on the same rounds. */
  series?: TrendSeries;
  /** The phone shape: narrower. Meant for one series at a time. */
  compact?: boolean;
}

const L = tokens.chart.stack;

/** Selection is kept per series, so switching the line clears it. */
interface Selection {
  series: TrendSeries;
  index: number;
}

/** Where a panel's grid sits, top to bottom. */
interface Panel {
  top: number;
  bottom: number;
}

/**
 * Scores as dots with their five-round average behind them, and the handicap
 * index as a step line, stacked as two small multiples on the same rounds, or
 * either alone. Hovering with a mouse or tapping on a phone picks a round.
 */
export function SVGScoreHandicapTrend({ data, series = "both", compact = false }: SVGScoreHandicapTrendProps) {
  const [selection, setSelection] = useState<Selection | null>(null);

  const scores = data.map((d) => d.score);
  const handicaps = data.map((d) => d.handicapIndex);
  const hasHandicap = knownValues(handicaps).length > 0;

  if (data.length < 2) {
    return <EmptyTrend compact={compact}>Not enough data</EmptyTrend>;
  }
  if (series !== "handicap" && knownValues(scores).length === 0) {
    return <EmptyTrend compact={compact}>No score data</EmptyTrend>;
  }
  if (series === "handicap" && !hasHandicap) {
    return <EmptyTrend compact={compact}>No handicap yet</EmptyTrend>;
  }

  // With no index yet there is nothing to stack the scores over.
  const shown: TrendSeries = series === "both" && !hasHandicap ? "score" : series;
  const stacked = shown === "both";
  const showScore = shown !== "handicap";
  const showHandicap = shown !== "score";

  const W = compact ? L.widthCompact : L.width;
  const H = stacked ? L.both.height : compact ? L.single.compactHeight : L.single.height;
  const gridRight = W - L.axis;
  const labelX = gridRight + L.labelGap;
  const alone: Panel = { top: L.single.top, bottom: H - L.single.bottomRoom };
  const scorePanel = stacked ? L.both.score : alone;
  const handicapPanel = stacked ? L.both.handicap : alone;
  const ticksY = stacked ? L.both.ticks : H - L.single.ticksRoom;
  const lastPanel = showHandicap ? handicapPanel : scorePanel;
  const firstPanel = showScore ? scorePanel : handicapPanel;

  // The par of the latest round that has one, drawn across the scores.
  const par = [...data].reverse().find((d) => d.par != null)?.par ?? null;

  const x = indexScale(data.length, L.inset, gridRight - L.inset);
  const yScore = scaleLinear()
    .domain(niceExtent([...scores, par], 5, 2) ?? [70, 90])
    .range([scorePanel.bottom, scorePanel.top]);
  const yHandicap = scaleLinear()
    .domain(niceExtent(handicaps, 3, 0.5) ?? [9, 13])
    .range([handicapPanel.bottom, handicapPanel.top]);

  // The server's five-round average, drawn behind the dots.
  const average = data.map((d) => d.rollingAverage);
  const averagePath =
    line<number | null>()
      .defined((v) => v != null)
      .x((_, i) => x(i))
      .y((v) => yScore(v!))(average) ?? "";
  const handicapPath =
    line<number | null>()
      .defined((v) => v != null)
      .x((_, i) => x(i))
      .y((v) => yHandicap(v!))
      .curve(curveStepAfter)(handicaps) ?? "";

  const scoreTicks = yScore.ticks(5).filter((v) => v !== yScore.domain()[0]);
  const handicapTicks = yHandicap.ticks(stacked ? 2 : 4).filter((v) => v !== yHandicap.domain()[0]);
  const parY = par != null ? yScore(par) : null;
  // The "Par" label has the room, so a tick figure that would run into it steps aside.
  const clearOfPar = (y: number) => parY == null || Math.abs(y - parY) > tokens.type.label.size;

  const lastScore = lastKnownIndex(scores);
  const lastHandicap = lastKnownIndex(handicaps);

  const indexAt = (e: PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const index = Math.round(x.invert((e.clientX - rect.left) * (W / rect.width)));
    return Math.max(0, Math.min(data.length - 1, index));
  };

  const active = selection?.series === shown ? selection.index : null;
  const point = active != null ? data[active] : null;
  const pointValue = point ? (showScore ? point.score : point.handicapIndex) : null;
  const pointY = pointValue != null ? (showScore ? yScore(pointValue) : yHandicap(pointValue)) : null;

  const handicapDots = [...new Set([lastHandicap, active])].flatMap((i) => {
    const value = i != null && i >= 0 ? handicaps[i] : null;
    return value != null && i != null ? [{ i, value }] : [];
  });
  const lastScoreValue = lastScore >= 0 ? scores[lastScore] : null;
  const lastHandicapValue = lastHandicap >= 0 ? handicaps[lastHandicap] : null;

  return (
    <div data-slot="score-handicap-trend" className="relative select-none">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={
          stacked
            ? "Score per round with 5-round average above, handicap index below"
            : showScore
              ? "Score per round with 5-round average"
              : "Handicap index per round"
        }
        className="block w-full touch-pan-y overflow-visible"
        onPointerMove={(e) => {
          if (e.pointerType === "mouse") setSelection({ series: shown, index: indexAt(e) });
        }}
        onPointerLeave={(e) => {
          if (e.pointerType === "mouse") setSelection(null);
        }}
        onPointerDown={(e) => {
          if (e.pointerType === "mouse") return;
          // A tap picks a round and a second tap on it puts it down.
          const index = indexAt(e);
          setSelection(active === index ? null : { series: shown, index });
        }}
      >
        {showScore && (
          <g>
            {stacked && <PanelTitle y={L.both.score.title}>Score</PanelTitle>}
            {scoreTicks.map((v) => (
              <g key={`score-${v}`}>
                <line x1={0} x2={gridRight} y1={yScore(v)} y2={yScore(v)} stroke={tokens.color.chart.grid} strokeWidth={tokens.lineWidth.border} />
                {clearOfPar(yScore(v)) && (
                  <AxisLabel x={labelX} y={yScore(v) + L.labelDrop}>
                    {v}
                  </AxisLabel>
                )}
              </g>
            ))}
            {parY != null && (
              <>
                <line
                  x1={0}
                  x2={gridRight}
                  y1={parY}
                  y2={parY}
                  stroke={tokens.color.chart.reference}
                  strokeWidth={tokens.lineWidth.border}
                  strokeDasharray={L.dash}
                />
                <AxisLabel x={labelX} y={parY + L.labelDrop}>
                  Par
                </AxisLabel>
              </>
            )}
            <path
              d={averagePath}
              fill="none"
              stroke={tokens.color.chart.series1}
              strokeOpacity={tokens.opacity.recessed}
              strokeWidth={L.stroke}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        )}

        {showHandicap && (
          <g>
            {stacked && <PanelTitle y={L.both.handicap.title}>Handicap index</PanelTitle>}
            {handicapTicks.map((v) => (
              <g key={`handicap-${v}`}>
                <line x1={0} x2={gridRight} y1={yHandicap(v)} y2={yHandicap(v)} stroke={tokens.color.chart.grid} strokeWidth={tokens.lineWidth.border} />
                <AxisLabel x={labelX} y={yHandicap(v) + L.labelDrop}>
                  {formatHandicapIndex(v)}
                </AxisLabel>
              </g>
            ))}
            <path
              d={handicapPath}
              fill="none"
              stroke={tokens.color.chart.series2}
              strokeWidth={L.strokeHandicap}
              strokeLinejoin="round"
            />
          </g>
        )}

        {xTickIndexes(data.length).map((i) => (
          <text
            key={`x-${i}`}
            x={x(i)}
            y={ticksY}
            textAnchor="middle"
            fontSize={tokens.type.label.size}
            fontFamily={tokens.font.sans}
            fill={tokens.color.mutedForeground}
          >
            {data[i].roundIndex}
          </text>
        ))}

        {active != null && (
          <line
            x1={x(active)}
            x2={x(active)}
            y1={firstPanel.top}
            y2={lastPanel.bottom}
            stroke={tokens.color.chart.muted}
            strokeWidth={tokens.lineWidth.border}
            strokeDasharray={tokens.chart.guideDash}
          />
        )}

        {showScore &&
          data.map((d, i) => {
            if (d.score == null) return null;
            // The server says where each round's differential stands toward the index.
            return (
              <circle
                key={`dot-${i}`}
                cx={x(i)}
                cy={yScore(d.score)}
                r={active === i ? L.dotHover : d.differentialStatus === "counting" ? L.dotCounts : L.dot}
                fill={differentialFill(d.differentialStatus)}
                stroke={tokens.color.card}
                strokeWidth={tokens.lineWidth.outline}
              />
            );
          })}

        {showScore && lastScoreValue != null && (
          <FigureLabel x={x(lastScore)} y={yScore(lastScoreValue) - L.scoreLift} anchor="middle" color={tokens.color.foreground}>
            {lastScoreValue}
          </FigureLabel>
        )}

        {showHandicap &&
          handicapDots.map(({ i, value }) => (
            <circle
              key={`handicap-dot-${i}`}
              cx={x(i)}
              cy={yHandicap(value)}
              r={active === i ? L.dotHover : L.dotLast}
              fill={tokens.color.chart.series2}
              stroke={tokens.color.card}
              strokeWidth={tokens.lineWidth.outline}
            />
          ))}

        {showHandicap && lastHandicapValue != null && (
          <FigureLabel
            x={x(lastHandicap) - L.lastLift}
            y={yHandicap(lastHandicapValue) - L.lastLift}
            anchor="end"
            color={tokens.color.chart.series2}
          >
            {formatHandicapIndex(lastHandicapValue)}
          </FigureLabel>
        )}
      </svg>

      <ChartTooltip
        id={point && active != null && pointY != null ? `${shown}-${active}` : null}
        at={{ x: x(active ?? 0) / W, y: (pointY ?? 0) / H }}
        className="min-w-32"
      >
        {point && active != null && pointY != null && (
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
                <span className="font-semibold text-chart-series2">{formatHandicapIndex(point.handicapIndex)}</span>
              </div>
            )}
          </>
        )}
      </ChartTooltip>
    </div>
  );
}


function PanelTitle({ y, children }: { y: number; children: ReactNode }) {
  return (
    <text
      x={0}
      y={y}
      fontSize={tokens.type.label.size}
      fontWeight="600"
      fontFamily={tokens.font.sans}
      fill={tokens.color.foregroundSecondary}
    >
      {children}
    </text>
  );
}

function AxisLabel({ x, y, children }: { x: number; y: number; children: ReactNode }) {
  return (
    <text x={x} y={y} fontSize={tokens.type.label.size} fontFamily={tokens.font.sans} fill={tokens.color.mutedForeground}>
      {children}
    </text>
  );
}

/** A figure written on the chart: the latest score or index. */
function FigureLabel({
  x,
  y,
  anchor,
  color,
  children,
}: {
  x: number;
  y: number;
  anchor: "middle" | "end";
  color: string;
  children: ReactNode;
}) {
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      fontSize={tokens.type["body-sm"].size}
      fontWeight="700"
      fontFamily={tokens.font.sans}
      fill={color}
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

/** The first round, every fifth after it, and the last: 1, 5, 10, 15, 20. A fifth that would crowd the last gives way. */
function xTickIndexes(count: number): number[] {
  const last = count - 1;
  const fifths = Array.from({ length: Math.floor(last / 5) }, (_, i) => (i + 1) * 5 - 1).filter((i) => last - i > 2);
  return [0, ...fifths.filter((i) => i > 2), last];
}

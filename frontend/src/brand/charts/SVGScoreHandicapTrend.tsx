import { useState, type PointerEvent, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { scaleLinear } from "d3-scale";
import { curveStepAfter, line } from "d3-shape";
import { cn } from "@/brand/cn";
import { ToParFigure } from "@/brand/components/ToParFigure";
import { tokens } from "@/brand/theme";
import { formatHandicapIndex, formatOneDecimal, type RoundTrendPoint } from "@/domain";
import { indexScale, knownValues, lastKnownIndex, niceExtent } from "./scales";

type TrendSeries = "both" | "score" | "handicap";

interface SVGScoreHandicapTrendProps {
  data: RoundTrendPoint[];
  /** Which panel to draw. `both` stacks the handicap index under the scores, on the same rounds. */
  series?: TrendSeries;
  /** The phone shape: narrower. Meant for one series at a time. */
  compact?: boolean;
  /**
   * Rounds that say nothing about the handicap, like one course's: every dot alike, and the
   * average drawn as the lead line rather than behind dots that mark which rounds count.
   */
  plain?: boolean;
  /** The best score, as the server found it. Its first round is marked in place of the latest. */
  best?: number | null;
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
export function SVGScoreHandicapTrend({
  data,
  series = "both",
  compact = false,
  plain = false,
  best = null,
}: SVGScoreHandicapTrendProps) {
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

  // The server says which rounds' differentials count toward the index.
  const counts = data.map((d) => d.differentialStatus === "counting");
  const lastScore = lastKnownIndex(scores);
  const bestIndex = best == null ? -1 : scores.indexOf(best);
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

  const handicapDots = new Set([lastHandicap, active].filter((i): i is number => i != null && i >= 0));

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
                  <AxisLabel x={labelX} y={yScore(v) + 4}>
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
                <AxisLabel x={labelX} y={parY + L.parBaseline}>
                  Par {par}
                </AxisLabel>
              </>
            )}
            <path
              d={averagePath}
              fill="none"
              stroke={tokens.color.chart.series1}
              strokeOpacity={plain ? 1 : tokens.opacity.recessed}
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
                <AxisLabel x={labelX} y={yHandicap(v) + 4}>
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
            strokeDasharray={`${tokens.space.dot} ${tokens.space.dot}`}
          />
        )}

        {showScore &&
          data.map((d, i) => {
            if (d.score == null) return null;
            if (plain) {
              return (
                <circle
                  key={`dot-${i}`}
                  cx={x(i)}
                  cy={yScore(d.score)}
                  r={active === i ? L.dotHover : L.dot}
                  fill={active === i ? tokens.color.foreground : tokens.color.borderStrong}
                  stroke={tokens.color.card}
                  strokeWidth={active === i ? tokens.lineWidth.outline : 0}
                />
              );
            }
            const counting = counts[i];
            return (
              <circle
                key={`dot-${i}`}
                cx={x(i)}
                cy={yScore(d.score)}
                r={active === i ? L.dotHover : counting ? L.dotCounts : L.dot}
                fill={counting ? tokens.color.chart.series1 : tokens.color.card}
                stroke={counting ? tokens.color.card : tokens.color.chart.reference}
                strokeWidth={tokens.lineWidth.outline}
              />
            );
          })}

        {showScore && bestIndex >= 0 && (
          <g data-slot="score-trend-best">
            <circle
              cx={x(bestIndex)}
              cy={yScore(best!)}
              r={L.dotHover}
              fill={tokens.color.score.birdie.base}
              stroke={tokens.color.card}
              strokeWidth={tokens.lineWidth.outline}
            />
            <FigureLabel x={x(bestIndex)} y={yScore(best!) - L.scoreLift} anchor={edgeAnchor(x(bestIndex), gridRight)} color={tokens.color.score.birdie.base}>
              Best {best}
            </FigureLabel>
          </g>
        )}

        {showScore && best == null && lastScore >= 0 && (
          <FigureLabel x={x(lastScore)} y={yScore(scores[lastScore]!) - L.scoreLift} anchor="middle" color={tokens.color.foreground}>
            {scores[lastScore]}
          </FigureLabel>
        )}

        {showHandicap &&
          [...handicapDots].map((i) => (
            <circle
              key={`handicap-dot-${i}`}
              cx={x(i)}
              cy={yHandicap(handicaps[i]!)}
              r={active === i ? L.dotHover : L.dotLast}
              fill={tokens.color.chart.series2}
              stroke={tokens.color.card}
              strokeWidth={tokens.lineWidth.outline}
            />
          ))}

        {showHandicap && lastHandicap >= 0 && (
          <FigureLabel
            x={x(lastHandicap) - L.lastLift}
            y={yHandicap(handicaps[lastHandicap]!) - L.lastLift}
            anchor="end"
            color={tokens.color.chart.series2}
          >
            {formatHandicapIndex(handicaps[lastHandicap])}
          </FigureLabel>
        )}
      </svg>

      <AnimatePresence>
        {point && active != null && pointY != null && (
          <motion.div
            key={`${shown}-${active}`}
            className={cn(
              "pointer-events-none absolute z-10 min-w-32 -translate-y-full rounded-xl border border-border bg-card/95 px-3 py-2.5 text-body-sm shadow-card",
              // Past two thirds of the way across, the card opens to the left of the point.
              x(active) > W * 0.65 ? "-ml-3 -translate-x-full" : "ml-3",
            )}
            style={{ left: `${(x(active) / W) * 100}%`, top: `${(pointY / H) * 100}%` }}
            initial={{ opacity: 0, scale: tokens.motion.tapScale }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: tokens.motion.tapScale }}
            transition={{ duration: tokens.motion.duration.collapse }}
          >
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
            {showScore && point.rollingAverage != null && (
              <div className="mt-0.5 flex items-center justify-between gap-3">
                <span className="text-muted-foreground">5-rd avg</span>
                <span className="font-semibold text-card-foreground">{formatOneDecimal(point.rollingAverage)}</span>
              </div>
            )}
            {showHandicap && point.handicapIndex != null && (
              <div className="mt-0.5 flex items-center justify-between gap-3">
                <span className="text-muted-foreground">HI</span>
                <span className="font-semibold text-chart-series2">{formatHandicapIndex(point.handicapIndex)}</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * What the dots and the faint line mean. It sits in a card's header beside the
 * title, so it takes its own place rather than the chart's. Each swatch is drawn
 * with the chart's own marks, at the chart's size.
 */
export function ScoreHandicapLegend({ className }: { className?: string }) {
  const box = 2 * (L.dotCounts + tokens.lineWidth.outline);
  const mid = box / 2;
  return (
    <div data-slot="score-handicap-legend" className={cn("flex gap-4 text-body-sm text-foreground-secondary", className)}>
      <span className="flex items-center gap-2">
        <svg viewBox={`0 0 ${box} ${box}`} width={box} height={box} aria-hidden="true">
          <circle cx={mid} cy={mid} r={L.dotCounts} fill={tokens.color.chart.series1} />
        </svg>
        Counts toward HI
      </span>
      <span className="flex items-center gap-2">
        <svg viewBox={`0 0 ${box} ${box}`} width={box} height={box} aria-hidden="true">
          <circle
            cx={mid}
            cy={mid}
            r={L.dot}
            fill={tokens.color.card}
            stroke={tokens.color.chart.reference}
            strokeWidth={tokens.lineWidth.outline}
          />
        </svg>
        Doesn’t count
      </span>
      <span className="flex items-center gap-2">
        <svg viewBox={`0 0 ${L.legendLine} ${box}`} width={L.legendLine} height={box} aria-hidden="true">
          <line
            x1={0}
            x2={L.legendLine}
            y1={mid}
            y2={mid}
            stroke={tokens.color.chart.series1}
            strokeOpacity={tokens.opacity.recessed}
            strokeWidth={L.stroke}
          />
        </svg>
        5-rd avg
      </span>
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
  anchor: "start" | "middle" | "end";
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

/** A label over a dot near either end of the grid reads inward, so the card's edge doesn't cut it. */
function edgeAnchor(x: number, right: number): "start" | "middle" | "end" {
  if (x < L.labelEdge) return "start";
  if (x > right - L.labelEdge) return "end";
  return "middle";
}

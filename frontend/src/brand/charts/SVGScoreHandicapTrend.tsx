import { useId, useState, type PointerEvent, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { scaleLinear } from "d3-scale";
import { area, curveMonotoneX, line } from "d3-shape";
import { cn } from "@/brand/cn";
import { ToParFigure } from "@/brand/components/ToParFigure";
import { color, differentialFillClass, toParSvgFillClass, tokens } from "@/brand/theme";
import { formatHandicapIndex, type RoundTrendPoint } from "@/domain";
import { indexScale, knownValues, paddedExtent } from "./scales";

type TrendSeries = "both" | "score" | "handicap";

interface SVGScoreHandicapTrendProps {
  data: RoundTrendPoint[];
  /** Which line to draw. `both` puts the handicap on a second axis at the right. */
  series?: TrendSeries;
  /** The phone shape: narrower and taller. Meant for one series at a time. */
  compact?: boolean;
}

const { chart, motion: motionTokens, space, lineWidth } = tokens;
const dash = `${space.dot} ${space.dot}`;

/** Selection is kept per series, so switching the line clears it. */
interface Selection {
  series: TrendSeries;
  index: number;
}

/**
 * Scores as bars under a line, the handicap index as a second line, or either
 * alone. Hovering with a mouse or tapping on a phone picks a round.
 */
export function SVGScoreHandicapTrend({ data, series = "both", compact = false }: SVGScoreHandicapTrendProps) {
  const plot = compact ? { ...chart.plot, ...chart.plotCompact } : chart.plot;
  const { width: W, height: H, pad: PAD } = plot;
  const hiGrad = `hiGrad${useId().replace(/:/g, "")}`;
  const [selection, setSelection] = useState<Selection | null>(null);

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

  const indexAt = (e: PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const index = Math.round(x.invert((e.clientX - rect.left) * (W / rect.width)));
    return Math.max(0, Math.min(data.length - 1, index));
  };

  const active = selection?.series === series ? selection.index : null;
  const point = active != null ? data[active] : null;
  const pointValue = point ? (showScore ? point.score : point.handicapIndex) : null;
  const pointY = pointValue != null ? (showScore ? yScore(pointValue) : yHandicap(pointValue)) : null;

  return (
    <div data-slot="score-handicap-trend" className="relative select-none">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full touch-pan-y overflow-visible"
        onPointerMove={(e) => {
          if (e.pointerType === "mouse") setSelection({ series, index: indexAt(e) });
        }}
        onPointerLeave={(e) => {
          if (e.pointerType === "mouse") setSelection(null);
        }}
        onPointerDown={(e) => {
          if (e.pointerType === "mouse") return;
          // A tap picks a round and a second tap on it puts it down.
          const index = indexAt(e);
          setSelection(active === index ? null : { series, index });
        }}
      >
        <defs>
          <linearGradient id={hiGrad} x1="0" y1="0" x2="0" y2="1">
            <stop offset="10%" stopColor={color("score-double-text")} stopOpacity={0.1} />
            <stop offset="100%" stopColor={color("score-double-text")} stopOpacity={0} />
          </linearGradient>
        </defs>

        {yLeft.ticks(5).map((v) => (
          <g key={`left-${v}`}>
            <line x1={PAD.left} x2={W - PAD.right} y1={yLeft(v)} y2={yLeft(v)} className="stroke-border" strokeWidth={lineWidth.border} />
            <AxisLabel x={PAD.left - 12} y={yLeft(v) + 4} anchor="end" className="fill-chart-axis">
              {showScore ? v : formatHandicapIndex(v)}
            </AxisLabel>
          </g>
        ))}

        <line x1={PAD.left} x2={W - PAD.right} y1={baseline} y2={baseline} className="stroke-chart-muted" strokeWidth={lineWidth.border} />

        {series === "both" &&
          hasHandicap &&
          yHandicap.ticks(4).map((v) => (
            <AxisLabel key={`right-${v}`} x={W - PAD.right + 12} y={yHandicap(v) + 4} anchor="start" className="fill-score-double">
              {formatHandicapIndex(v)}
            </AxisLabel>
          ))}

        {xTicks.map((i) => (
          <AxisLabel key={`x-${i}`} x={x(i)} y={baseline + 16} anchor="middle" className="fill-chart-axis">
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
                className={differentialFillClass(d.differentialStatus)}
                fillOpacity={0.6}
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
              className="stroke-score-double"
              strokeWidth={series === "both" ? space.bar : chart.sparkline.stroke}
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
            className="stroke-primary"
            strokeWidth={chart.sparkline.stroke}
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
            className="stroke-chart-muted"
            strokeWidth={lineWidth.border}
            strokeDasharray={dash}
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
              className={cn("stroke-card", showScore ? toParSvgFillClass(d.toPar) : "fill-score-double")}
              strokeWidth={space.bar}
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
                className="fill-chart-axis font-sans text-caption"
                fontWeight="600"
              >
                {d.score}
              </text>
            ),
          )}
      </svg>

      <AnimatePresence>
        {point && active != null && pointY != null && (
          <motion.div
            key={`${series}-${active}`}
            className={cn(
              "pointer-events-none absolute z-10 min-w-32 -translate-y-full rounded-xl border border-border bg-card/95 px-3 py-2.5 text-body-sm shadow-card",
              // Past two thirds of the way across, the card opens to the left of the point.
              x(active) > W * 0.65 ? "-ml-3 -translate-x-full" : "ml-3",
            )}
            style={{ left: `${(x(active) / W) * 100}%`, top: `${(pointY / H) * 100}%` }}
            initial={{ opacity: 0, scale: motionTokens.tapScale }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: motionTokens.tapScale }}
            transition={{ duration: motionTokens.duration.collapse }}
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
            {showHandicap && point.handicapIndex != null && (
              <div className="mt-0.5 flex items-center justify-between gap-3">
                <span className="text-muted-foreground">HI</span>
                <span className="font-semibold text-score-double">{formatHandicapIndex(point.handicapIndex)}</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AxisLabel({
  x,
  y,
  anchor,
  className,
  children,
}: {
  x: number;
  y: number;
  anchor: "start" | "middle" | "end";
  /** The label's fill. */
  className: string;
  children: ReactNode;
}) {
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      fontWeight="600"
      className={cn("stroke-card font-sans text-label", className)}
      paintOrder="stroke"
      strokeWidth={lineWidth.ring}
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

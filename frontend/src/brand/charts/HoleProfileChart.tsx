import { useState, type MouseEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { scaleLinear } from "d3-scale";
import { cn } from "@/brand/cn";
import { ScoreMixBar } from "@/brand/charts/ScoreMixBar";
import { paddedExtent } from "@/brand/charts/scales";
import { ToParFigure } from "@/brand/components/ToParFigure";
import { toParMarkFill, tokens } from "@/brand/theme";
import type { HoleStats } from "@/domain";
import { formatOneDecimal, pluralize } from "@/domain/format";
import { formatAverageToParTenths, roundAverageToParTenths } from "@/domain/score";
import { useChartWidth } from "./useChartWidth";

interface HoleProfileChartProps {
  /** In the order to draw them: course order, or hardest first. */
  holes: readonly HoleStats[];
  /** The holes run hardest first rather than 1 to 18, so there are no nines to divide. */
  ranked?: boolean;
}

/**
 * How each hole of a course plays for the golfer, one column a hole: a bar from level to their
 * average to par, painted by it, with a whisker for how far their score swings there. Course order
 * shows where the trouble sits; hardest first ranks it. Hovering a hole shows its average, its
 * spread and the mix of scores on it. One chart for what the course page used to split across a
 * to-par chart, a difficulty ranking, a variance chart and a score-mix chart.
 */
export function HoleProfileChart({ holes, ranked = false }: HoleProfileChartProps) {
  const { width, minWidth, height: H, pad: PAD, bar, corner, whisker, cap, labelGap, numberDrop, level } =
    tokens.chart.holes;
  const [W, measure] = useChartWidth(width, minWidth);
  const [hovered, setHovered] = useState<number | null>(null);
  if (holes.length === 0) return null;

  const bottom = H - PAD.bottom;
  const x = scaleLinear().domain([0, holes.length]).range([PAD.left, W - PAD.right]);
  const column = x(1) - x(0);
  const reach = holes.flatMap((hole) =>
    hole.spread != null ? [hole.averageToPar - hole.spread, hole.averageToPar + hole.spread] : [hole.averageToPar],
  );
  const y = scaleLinear()
    .domain(paddedExtent([0, ...reach], 0.25) ?? [-1, 1])
    .nice(4)
    .range([bottom, PAD.top]);
  const ticks = y.ticks(4);
  const tipHole = hovered != null ? holes[hovered] : null;
  // Course order is split at the turn, where hole 10 starts.
  const turn = ranked ? -1 : holes.findIndex((hole) => hole.hole === 10);

  const handleMouseMove = (e: MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const at = Math.floor(x.invert((e.clientX - rect.left) * (W / rect.width)));
    setHovered(Math.max(0, Math.min(holes.length - 1, at)));
  };

  return (
    <div data-slot="hole-profile-chart">
      <div ref={measure} className="overflow-x-auto">
        <div className="relative min-w-chart-flow select-none">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            role="img"
            aria-label={`Average to par on each hole${ranked ? ", hardest first" : ""}`}
            className="block w-full overflow-visible"
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setHovered(null)}
          >
            {hovered != null && (
              <rect
                x={x(hovered)}
                y={PAD.top}
                width={column}
                height={bottom - PAD.top}
                rx={corner}
                fill={tokens.color.chart.grid}
              />
            )}
            {ticks.map((tick) => (
              <g key={tick}>
                <line
                  x1={PAD.left}
                  x2={W - PAD.right}
                  y1={y(tick)}
                  y2={y(tick)}
                  stroke={tick === 0 ? tokens.color.chart.reference : tokens.color.chart.grid}
                  strokeWidth={tokens.lineWidth.border}
                  strokeDasharray={tick === 0 ? tokens.chart.guideDash : undefined}
                />
                <text
                  x={PAD.left - labelGap}
                  y={y(tick)}
                  textAnchor="end"
                  dominantBaseline="central"
                  fontSize={tokens.type.label.size}
                  fontFamily={tokens.font.sans}
                  fill={tokens.color.mutedForeground}
                >
                  {formatAverageToParTenths(tick)}
                </text>
              </g>
            ))}
            {turn > 0 && (
              <line
                x1={x(turn)}
                x2={x(turn)}
                y1={PAD.top}
                y2={H}
                stroke={tokens.color.border}
                strokeWidth={tokens.lineWidth.border}
              />
            )}

            {holes.map((hole, i) => {
              const centre = x(i + 0.5);
              // A hole played at level still gets a mark: a sliver centred on the level line.
              const span = Math.abs(y(hole.averageToPar) - y(0));
              const height = Math.max(level, span);
              const top = Math.min(y(0), y(hole.averageToPar)) - (height - span) / 2;
              const fill = toParMarkFill(roundAverageToParTenths(hole.averageToPar));
              return (
                <g key={hole.hole}>
                  {/* Keyed by hole, so switching the order slides each hole to its new place. */}
                  <motion.rect
                    width={column * bar}
                    rx={corner}
                    fill={fill}
                    initial={false}
                    animate={{ x: centre - (column * bar) / 2, y: top, height }}
                    transition={tokens.motion.layout}
                  />
                  {hole.spread != null && hole.spread > 0 && (
                    <motion.g
                      initial={false}
                      animate={{ x: centre }}
                      transition={tokens.motion.layout}
                      stroke={tokens.color.chart.reference}
                      strokeWidth={whisker}
                      strokeLinecap="round"
                    >
                      <line x1={0} x2={0} y1={y(hole.averageToPar - hole.spread)} y2={y(hole.averageToPar + hole.spread)} />
                      <line x1={-cap} x2={cap} y1={y(hole.averageToPar + hole.spread)} y2={y(hole.averageToPar + hole.spread)} />
                      <line x1={-cap} x2={cap} y1={y(hole.averageToPar - hole.spread)} y2={y(hole.averageToPar - hole.spread)} />
                    </motion.g>
                  )}
                  <motion.text
                    initial={false}
                    animate={{ x: centre }}
                    transition={tokens.motion.layout}
                    y={bottom + numberDrop}
                    textAnchor="middle"
                    fontSize={tokens.type.meta.size}
                    fontFamily={tokens.font.sans}
                    fontWeight={hovered === i ? "600" : "400"}
                    fill={hovered === i ? tokens.color.foreground : tokens.color.mutedForeground}
                  >
                    {hole.hole}
                  </motion.text>
                </g>
              );
            })}
          </svg>

          <AnimatePresence>
            {tipHole && hovered != null && (
              <motion.div
                key={tipHole.hole}
                className={cn(
                  "pointer-events-none absolute top-0 z-10 w-56 rounded-xl border border-border bg-card/glass px-3 py-2.5 text-body-sm shadow-card",
                  // Past the middle of the chart, the card opens to the left of the hole.
                  x(hovered + 0.5) > W * 0.6 ? "-ml-6 -translate-x-full" : "ml-6",
                )}
                style={{ left: `${(x(hovered + 0.5) / W) * 100}%` }}
                initial={{ opacity: 0, scale: tokens.motion.tapScale }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: tokens.motion.tapScale }}
                transition={{ duration: tokens.motion.duration.collapse }}
              >
                <div className="mb-1 flex items-baseline justify-between gap-3">
                  <span className="text-sm font-bold text-card-foreground">Hole {tipHole.hole}</span>
                  <span className="text-muted-foreground">Par {tipHole.par}</span>
                </div>
                <div className="font-medium text-card-foreground">
                  {formatOneDecimal(tipHole.averageScore)} avg{" "}
                  <ToParFigure
                    toPar={roundAverageToParTenths(tipHole.averageToPar)}
                    label={formatAverageToParTenths(tipHole.averageToPar)}
                    size="inherit"
                  />
                </div>
                <div className="mb-2 text-muted-foreground">
                  {tipHole.spread != null ? `Swings ±${formatOneDecimal(tipHole.spread)} · ` : ""}
                  {pluralize(tipHole.rounds, "round")}
                </div>
                <ScoreMixBar mix={tipHole.mix} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

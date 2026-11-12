import { useState, type MouseEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { scaleLinear } from "d3-scale";
import { cn } from "@/brand/cn";
import { tokens, toParMarkFill } from "@/brand/theme";
import type { HoleStats } from "@/domain";
import { roundAverageToParTenths } from "@/domain/score";
import { formatOneDecimal, formatPercent, pluralize } from "@/domain/format";
import { useChartWidth } from "./useChartWidth";

interface HoleGreensPuttsChartProps {
  /** In course order. */
  holes: readonly HoleStats[];
}

/** Putts read against two a hole: fewer reads like a birdie, more like a bogey. */
const TWO_PUTTS = 2;

/**
 * Greens and putts on each hole of a course, on one hole axis: the share of greens the golfer hits
 * as a bar over its full height, and under it their average putts as a stem from two putts, painted
 * the way a score is (under two reads good, over reads bad). Where a missed green and an extra putt
 * meet on the same hole is plain to see. One chart for what the course page used to split across a
 * greens chart and a putts chart.
 */
export function HoleGreensPuttsChart({ holes }: HoleGreensPuttsChartProps) {
  const { width, minWidth, pad: PAD, bar, corner, labelGap, greens: G, putts: P, pairedHeight: H, numbers, dot, stem } =
    tokens.chart.holes;
  const [W, measure] = useChartWidth(width, minWidth);
  const [hovered, setHovered] = useState<number | null>(null);
  if (holes.length === 0) return null;

  const x = scaleLinear().domain([0, holes.length]).range([PAD.left, W - PAD.right]);
  const column = x(1) - x(0);
  const greens = scaleLinear().domain([0, 100]).range([G.bottom, G.top]);
  const known = holes.flatMap((hole) => (hole.putts != null ? [hole.putts] : []));
  const putts = scaleLinear()
    .domain([Math.min(1, ...known), Math.max(3, ...known)])
    .nice(2)
    .range([P.bottom, P.top]);
  const turn = holes.findIndex((hole) => hole.hole === 10);
  const tip = hovered != null ? holes[hovered] : null;

  const label = (text: string, at: number) => (
    <text
      x={PAD.left - labelGap}
      y={at}
      textAnchor="end"
      dominantBaseline="central"
      fontSize={tokens.type.label.size}
      fontFamily={tokens.font.sans}
      fill={tokens.color.mutedForeground}
    >
      {text}
    </text>
  );
  const title = (text: string, at: number) => (
    <text x={PAD.left} y={at} fontSize={tokens.type.label.size} fontFamily={tokens.font.sans} fontWeight="600" fill={tokens.color.foregroundSecondary}>
      {text}
    </text>
  );

  const handleMouseMove = (e: MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const at = Math.floor(x.invert((e.clientX - rect.left) * (W / rect.width)));
    setHovered(Math.max(0, Math.min(holes.length - 1, at)));
  };

  return (
    <div data-slot="hole-greens-putts-chart">
      <div ref={measure} className="overflow-x-auto">
        <div className="relative min-w-chart-flow select-none">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            role="img"
            aria-label="Greens hit and average putts on each hole"
            className="block w-full overflow-visible"
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setHovered(null)}
          >
            {hovered != null && (
              <rect x={x(hovered)} y={G.top} width={column} height={P.bottom - G.top} rx={corner} fill={tokens.color.chart.grid} />
            )}
            {title("Greens hit", G.top - labelGap)}
            {label("100%", greens(100))}
            {label("0%", greens(0))}
            {title("Putts", P.top - labelGap)}
            {putts.ticks(2).map((tick) => (
              <g key={tick}>
                <line
                  x1={PAD.left}
                  x2={W - PAD.right}
                  y1={putts(tick)}
                  y2={putts(tick)}
                  stroke={tick === TWO_PUTTS ? tokens.color.chart.reference : tokens.color.chart.grid}
                  strokeWidth={tokens.lineWidth.border}
                  strokeDasharray={tick === TWO_PUTTS ? tokens.chart.guideDash : undefined}
                />
                {label(String(tick), putts(tick))}
              </g>
            ))}
            {turn > 0 && (
              <line x1={x(turn)} x2={x(turn)} y1={G.top} y2={H} stroke={tokens.color.border} strokeWidth={tokens.lineWidth.border} />
            )}

            {holes.map((hole, i) => {
              const centre = x(i + 0.5);
              const left = centre - (column * bar) / 2;
              // Two putts to the tenth reads level, painted the way a to par is.
              const paint = toParMarkFill(hole.putts != null ? roundAverageToParTenths(hole.putts - TWO_PUTTS) : null);
              return (
                <g key={hole.hole}>
                  {/* The bar's full height is every green; the fill is the share hit. */}
                  <rect x={left} y={G.top} width={column * bar} height={G.bottom - G.top} rx={corner} fill={tokens.color.chart.muted} />
                  {hole.greens != null && (
                    <motion.rect
                      x={left}
                      width={column * bar}
                      rx={corner}
                      fill={tokens.color.primary}
                      initial={false}
                      animate={{ y: greens(hole.greens), height: G.bottom - greens(hole.greens) }}
                      transition={tokens.motion.layout}
                    />
                  )}
                  {hole.putts != null && (
                    <g>
                      <line
                        x1={centre}
                        x2={centre}
                        y1={putts(TWO_PUTTS)}
                        y2={putts(hole.putts)}
                        stroke={paint}
                        strokeWidth={stem}
                        strokeLinecap="round"
                      />
                      <circle cx={centre} cy={putts(hole.putts)} r={dot} fill={paint} />
                    </g>
                  )}
                  <text
                    x={centre}
                    y={numbers}
                    textAnchor="middle"
                    fontSize={tokens.type.meta.size}
                    fontFamily={tokens.font.sans}
                    fontWeight={hovered === i ? "600" : "400"}
                    fill={hovered === i ? tokens.color.foreground : tokens.color.mutedForeground}
                  >
                    {hole.hole}
                  </text>
                </g>
              );
            })}
          </svg>

          <AnimatePresence>
            {tip && hovered != null && (
              <motion.div
                key={tip.hole}
                className={cn(
                  "pointer-events-none absolute top-0 z-10 min-w-40 rounded-xl border border-border bg-card/glass px-3 py-2.5 text-body-sm shadow-card",
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
                  <span className="text-sm font-bold text-card-foreground">Hole {tip.hole}</span>
                  <span className="text-muted-foreground">Par {tip.par}</span>
                </div>
                <div className="text-card-foreground">
                  Greens <span className="font-semibold">{formatPercent(tip.greens)}</span>
                </div>
                <div className="text-card-foreground">
                  Putts <span className="font-semibold">{formatOneDecimal(tip.putts)}</span>
                </div>
                <div className="mt-1 text-muted-foreground">{pluralize(tip.rounds, "round")}</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

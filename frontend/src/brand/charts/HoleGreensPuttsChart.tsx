import { motion } from "framer-motion";
import { scaleLinear } from "d3-scale";
import { tokens, verdictFill } from "@/brand/theme";
import type { HoleStats } from "@/domain";
import { formatOneDecimal, formatPercent, pluralize } from "@/domain/format";
import { ChartTooltip } from "./ChartTooltip";
import { HoleColumn, HoleNumber, NineDivider } from "./holeAxis";
import { useChartWidth } from "./useChartWidth";
import { useColumnHover } from "./useColumnHover";
import { useLayoutTransition } from "./useLayoutTransition";

interface HoleGreensPuttsChartProps {
  /** In course order. */
  holes: readonly HoleStats[];
}

/** The line the putts stems grow from: two a hole, which the server reads them against. */
const TWO_PUTTS = 2;

/**
 * Greens and putts on each hole of a course, on one hole axis: the share of greens the golfer hits
 * as a bar over its full height, and under it their average putts as a stem from two putts, painted
 * by the server's verdict on them (fewer than two good, more bad). Where a missed green and an extra putt
 * meet on the same hole is plain to see. One chart for what the course page used to split across a
 * greens chart and a putts chart.
 */
export function HoleGreensPuttsChart({ holes }: HoleGreensPuttsChartProps) {
  const { width, minWidth, pad: PAD, bar, corner, labelGap, greens: G, putts: P, pairedHeight: H, numbers, dot, stem } =
    tokens.chart.holes;
  const [W, measure] = useChartWidth(width, minWidth);
  const { hovered, track } = useColumnHover();
  const move = useLayoutTransition();
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

  return (
    <div data-slot="hole-greens-putts-chart">
      <div ref={measure} className="overflow-x-auto">
        <div className="relative min-w-chart-flow select-none">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            role="img"
            aria-label="Greens hit and average putts on each hole"
            className="block w-full overflow-visible"
            {...track(x, 0, holes.length - 1, W)}
          >
            {hovered != null && <HoleColumn x={x(hovered)} width={column} top={G.top} bottom={P.bottom} />}
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
            {turn > 0 && <NineDivider x={x(turn)} top={G.top} bottom={H} />}

            {holes.map((hole, i) => {
              const centre = x(i + 0.5);
              const left = centre - (column * bar) / 2;
              const paint = verdictFill(hole.puttsVerdict);
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
                      transition={move}
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
                  <HoleNumber x={centre} y={numbers} active={hovered === i}>
                    {hole.hole}
                  </HoleNumber>
                </g>
              );
            })}
          </svg>

          <ChartTooltip id={tip?.hole ?? null} at={{ x: hovered != null ? x(hovered + 0.5) / W : 0 }} className="min-w-40">
            {tip && (
              <>
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
              </>
            )}
          </ChartTooltip>
        </div>
      </div>
    </div>
  );
}

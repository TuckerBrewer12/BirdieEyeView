import { motion } from "framer-motion";
import { scaleLinear } from "d3-scale";
import { ScoreMixBar } from "@/brand/charts/ScoreMixBar";
import { paddedExtent } from "@/brand/charts/scales";
import { ToParFigure } from "@/brand/components/ToParFigure";
import { toParMarkFill, tokens } from "@/brand/theme";
import type { HoleStats } from "@/domain";
import { formatOneDecimal, pluralize } from "@/domain/format";
import { formatAverageToParTenths, roundAverageToParTenths } from "@/domain/score";
import { ChartTooltip } from "./ChartTooltip";
import { HoleColumn, HoleNumber, NineDivider } from "./holeAxis";
import { useChartWidth } from "./useChartWidth";
import { useColumnHover } from "./useColumnHover";
import { useLayoutTransition } from "./useLayoutTransition";

interface HoleProfileChartProps {
  holes: readonly HoleStats[];
  ranked?: boolean;
}

export function HoleProfileChart({ holes, ranked = false }: HoleProfileChartProps) {
  const { width, minWidth, height: H, pad: PAD, bar, corner, whisker, cap, labelGap, numberDrop, level } =
    tokens.chart.holes;
  const [W, measure] = useChartWidth(width, minWidth);
  const { hovered, track } = useColumnHover();
  const move = useLayoutTransition();
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
  const turn = ranked ? -1 : holes.findIndex((hole) => hole.hole === 10);

  return (
    <div data-slot="hole-profile-chart">
      <div ref={measure} className="overflow-x-auto">
        <div className="relative min-w-chart-flow select-none">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            role="img"
            aria-label={`Average to par on each hole${ranked ? ", hardest first" : ""}`}
            className="block w-full overflow-visible"
            {...track(x, 0, holes.length - 1, W)}
          >
            {hovered != null && <HoleColumn x={x(hovered)} width={column} top={PAD.top} bottom={bottom} />}
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
            {turn > 0 && <NineDivider x={x(turn)} top={PAD.top} bottom={H} />}

            {holes.map((hole, i) => {
              const centre = x(i + 0.5);
              const span = Math.abs(y(hole.averageToPar) - y(0));
              const height = Math.max(level, span);
              const top = Math.min(y(0), y(hole.averageToPar)) - (height - span) / 2;
              const fill = toParMarkFill(roundAverageToParTenths(hole.averageToPar));
              return (
                <g key={hole.hole}>
                  <motion.rect
                    width={column * bar}
                    rx={corner}
                    fill={fill}
                    initial={false}
                    animate={{ x: centre - (column * bar) / 2, y: top, height }}
                    transition={move}
                  />
                  {hole.spread != null && hole.spread > 0 && (
                    <motion.g
                      initial={false}
                      animate={{ x: centre }}
                      transition={move}
                      stroke={tokens.color.chart.reference}
                      strokeWidth={whisker}
                      strokeLinecap="round"
                    >
                      <line x1={0} x2={0} y1={y(hole.averageToPar - hole.spread)} y2={y(hole.averageToPar + hole.spread)} />
                      <line x1={-cap} x2={cap} y1={y(hole.averageToPar + hole.spread)} y2={y(hole.averageToPar + hole.spread)} />
                      <line x1={-cap} x2={cap} y1={y(hole.averageToPar - hole.spread)} y2={y(hole.averageToPar - hole.spread)} />
                    </motion.g>
                  )}
                  <HoleNumber x={centre} y={bottom + numberDrop} active={hovered === i} moving>
                    {hole.hole}
                  </HoleNumber>
                </g>
              );
            })}
          </svg>

          <ChartTooltip id={tipHole?.hole ?? null} at={{ x: hovered != null ? x(hovered + 0.5) / W : 0 }} className="w-56">
            {tipHole && (
              <>
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
              </>
            )}
          </ChartTooltip>
        </div>
      </div>
    </div>
  );
}

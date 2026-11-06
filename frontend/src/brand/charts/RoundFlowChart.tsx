import { useState, type MouseEvent } from "react";
import { AnimatePresence, motion, useReducedMotion, useReducedMotionConfig } from "framer-motion";
import { scaleLinear } from "d3-scale";
import { curveMonotoneX, line } from "d3-shape";
import { cn } from "@/brand/cn";
import { scoreKindLabel, scoreWashClass, toParLabel, toParTextClass, tokens } from "@/brand/theme";
import type { HoleScore, Round } from "@/domain";
import { pluralize } from "@/domain/format";
import type { ScoreKind } from "@/domain/score";

interface RoundFlowChartProps {
  round: Round;
}

/** A hole that can be plotted: scored, with a par the server classified it against. */
type FlowHole = HoleScore & { strokes: number; toPar: number; kind: ScoreKind };

const Y_TICKS = [-3, -2, -1, 0, 1, 2, 3];

/**
 * How a round went hole by hole: each hole's score to par, joined into a line,
 * over-par holes above the dashed par line and under-par ones below it.
 * Wider than a phone, so it scrolls sideways rather than shrinking its labels.
 */
export function RoundFlowChart({ round }: RoundFlowChartProps) {
  const { width: W, height: H, pad: PAD, extent, stroke, parLine, dot, dotHover } = tokens.chart.flow;
  // The OS setting, or a MotionConfig asking for stillness (the kit's screenshot harness).
  const prefersReduced = useReducedMotion();
  const configReduced = useReducedMotionConfig();
  const reduceMotion = prefersReduced || configReduced;
  const [hovered, setHovered] = useState<FlowHole | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const holes = round.holes.filter(
    (hole): hole is FlowHole => hole.strokes != null && hole.toPar != null && hole.kind != null,
  );
  if (holes.length < 3) return null;

  const first = holes[0].hole;
  const last = holes[holes.length - 1].hole;
  const x = scaleLinear().domain([first, last]).range([PAD.left, W - PAD.right]);
  // Over par plots upward: a bad hole is a climb.
  const y = scaleLinear().domain([-extent, extent]).range([H - PAD.bottom, PAD.top]);
  const yOf = (toPar: number) => y(Math.max(-extent, Math.min(extent, toPar)));

  const path =
    line<FlowHole>()
      .x((hole) => x(hole.hole))
      .y((hole) => yOf(hole.toPar))
      .curve(curveMonotoneX)(holes) ?? "";

  const handleMouseMove = (e: MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const number = Math.round(x.invert((e.clientX - rect.left) * (W / rect.width)));
    setHovered(holes.find((hole) => hole.hole === Math.max(first, Math.min(last, number))) ?? null);
    setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div data-slot="round-flow-chart" className="overflow-x-auto">
      <div className="relative min-w-chart-wide select-none">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full overflow-visible"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHovered(null)}
        >
          <line
            x1={PAD.left}
            x2={W - PAD.right}
            y1={y(0)}
            y2={y(0)}
            stroke={tokens.color.chart.muted}
            strokeWidth={parLine.stroke}
            strokeDasharray={parLine.dash}
          />

          {first <= 9 && last > 9 && (
            <line
              x1={x(9.5)}
              x2={x(9.5)}
              y1={PAD.top}
              y2={H - PAD.bottom}
              stroke={tokens.color.border}
              strokeWidth={tokens.lineWidth.border}
            />
          )}

          <motion.path
            d={path}
            fill="none"
            stroke={tokens.color.chart.axis}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeLinejoin="round"
            // Reduced motion starts at the end state, so there is nothing left to animate.
            initial={reduceMotion ? false : { pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={tokens.motion.draw}
          />

          {holes.map((hole, i) => (
            <motion.circle
              key={hole.hole}
              cx={x(hole.hole)}
              cy={yOf(hole.toPar)}
              r={hovered?.hole === hole.hole ? dotHover : dot}
              fill={tokens.color.score[hole.kind].base}
              stroke={tokens.color.card}
              strokeWidth={tokens.lineWidth.outline}
              className="cursor-crosshair"
              initial={reduceMotion ? false : { scale: tokens.motion.pop.from, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                delay: tokens.motion.pop.delay + i * tokens.motion.pop.stagger,
                duration: tokens.motion.pop.duration,
                ease: tokens.motion.pop.ease,
              }}
            />
          ))}

          {hovered && (
            <line
              x1={x(hovered.hole)}
              x2={x(hovered.hole)}
              y1={PAD.top}
              y2={H - PAD.bottom}
              stroke={tokens.color.chart.muted}
              strokeWidth={tokens.lineWidth.border}
              strokeDasharray={tokens.chart.guideDash}
            />
          )}

          {holes.map((hole) => (
            <text
              key={`label-${hole.hole}`}
              x={x(hole.hole)}
              y={H - PAD.bottom + 14}
              textAnchor="middle"
              fontSize={tokens.type.meta.size}
              fontFamily={tokens.font.sans}
              fill={hovered?.hole === hole.hole ? tokens.color.foreground : tokens.color.chart.axis}
              fontWeight={hovered?.hole === hole.hole ? "600" : "400"}
            >
              {hole.hole}
            </text>
          ))}

          {Y_TICKS.map((toPar) => (
            <text
              key={`tick-${toPar}`}
              x={PAD.left - 8}
              y={y(toPar) + 4}
              textAnchor="end"
              fontSize={tokens.type.caption.size}
              fontFamily={tokens.font.sans}
              fill="currentColor"
              className={toParTextClass(toPar)}
              fontWeight="500"
            >
              {toParLabel(toPar)}
            </text>
          ))}
        </svg>

        <AnimatePresence>
          {hovered && (
            <motion.div
              key={hovered.hole}
              className="pointer-events-none absolute z-10 min-w-32 rounded-xl border border-border bg-card/glass px-3 py-2.5 text-body-sm shadow-card"
              style={{
                left: tooltipPos.x + (tooltipPos.x > W * 0.65 ? -150 : 14),
                top: tooltipPos.y - 10,
              }}
              initial={{ opacity: 0, scale: tokens.motion.tapScale, y: 4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: tokens.motion.tapScale, y: 4 }}
              transition={{ duration: tokens.motion.duration.collapse }}
            >
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <span className="text-sm font-bold text-card-foreground">Hole {hovered.hole}</span>
                <span
                  className={cn("rounded-full px-1.5 py-0.5 text-xs font-semibold", scoreWashClass(hovered.kind))}
                >
                  {scoreKindLabel(hovered.kind)}
                </span>
              </div>
              <div className="mb-1 font-medium text-card-foreground">
                {hovered.strokes} strokes
                <span className="ml-1 font-normal text-muted-foreground">
                  ({toParLabel(hovered.toPar)}) · Par {hovered.par}
                </span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <span>{hovered.putts != null ? pluralize(hovered.putts, "putt") : "Putts N/A"}</span>
                {hovered.gir != null && (
                  <span className={hovered.gir ? "text-score-birdie" : undefined}>
                    {hovered.gir ? "GIR ✓" : "No GIR"}
                  </span>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

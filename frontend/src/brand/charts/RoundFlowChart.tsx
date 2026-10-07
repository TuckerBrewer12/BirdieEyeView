import { useState, type MouseEvent } from "react";
import { AnimatePresence, motion, useReducedMotion, useReducedMotionConfig } from "framer-motion";
import { scaleLinear } from "d3-scale";
import { curveMonotoneX, line } from "d3-shape";
import {
  chartColors,
  chartLayout,
  colors,
  fonts,
  motion as motionTokens,
  scoreKindLabel,
  toParLabel,
  toParTextClass,
  typography,
} from "@/brand/theme";
import type { HoleScore, Round } from "@/domain";
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
  const { width: W, height: H, pad: PAD, extent, dot, dotHover } = chartLayout.flow;
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
            stroke={chartColors.muted}
            strokeWidth={1.5}
            strokeDasharray="5 4"
          />

          {first <= 9 && last > 9 && (
            <line
              x1={x(9.5)}
              x2={x(9.5)}
              y1={PAD.top}
              y2={H - PAD.bottom}
              stroke={colors.border}
              strokeWidth={1}
            />
          )}

          <motion.path
            d={path}
            fill="none"
            stroke={chartColors.axis}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            // Reduced motion starts at the end state, so there is nothing left to animate.
            initial={reduceMotion ? false : { pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={motionTokens.draw}
          />

          {holes.map((hole, i) => (
            <motion.circle
              key={hole.hole}
              cx={x(hole.hole)}
              cy={yOf(hole.toPar)}
              r={hovered?.hole === hole.hole ? dotHover : dot}
              fill={colors.score[hole.kind].base}
              stroke={colors.card}
              strokeWidth={1.5}
              className="cursor-crosshair"
              initial={reduceMotion ? false : { scale: motionTokens.pop.from, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                delay: motionTokens.pop.delay + i * motionTokens.pop.stagger,
                duration: motionTokens.pop.duration,
                ease: motionTokens.pop.ease,
              }}
            />
          ))}

          {hovered && (
            <line
              x1={x(hovered.hole)}
              x2={x(hovered.hole)}
              y1={PAD.top}
              y2={H - PAD.bottom}
              stroke={chartColors.muted}
              strokeWidth={1}
              strokeDasharray="3 3"
            />
          )}

          {holes.map((hole) => (
            <text
              key={`label-${hole.hole}`}
              x={x(hole.hole)}
              y={H - PAD.bottom + 14}
              textAnchor="middle"
              fontSize={typography.meta}
              fontFamily={fonts.sans}
              fill={hovered?.hole === hole.hole ? colors.foreground : chartColors.axis}
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
              fontSize={typography.caption}
              fontFamily={fonts.sans}
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
              className="pointer-events-none absolute z-10 min-w-32 rounded-xl border border-border bg-card/95 px-3 py-2.5 text-body-sm shadow-card"
              style={{
                left: tooltipPos.x + (tooltipPos.x > W * 0.65 ? -150 : 14),
                top: tooltipPos.y - 10,
              }}
              initial={{ opacity: 0, scale: motionTokens.tapScale, y: 4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: motionTokens.tapScale, y: 4 }}
              transition={{ duration: motionTokens.duration.collapse }}
            >
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <span className="text-sm font-bold text-card-foreground">Hole {hovered.hole}</span>
                <span
                  className="rounded-full px-1.5 py-0.5 text-xs font-semibold"
                  style={{
                    background: colors.score[hovered.kind].muted,
                    color: colors.score[hovered.kind].onMuted,
                  }}
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
                <span>{hovered.putts != null ? `${hovered.putts} putts` : "Putts N/A"}</span>
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

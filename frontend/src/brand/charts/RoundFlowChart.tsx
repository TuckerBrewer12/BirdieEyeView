import { useState, type MouseEvent } from "react";
import { AnimatePresence, motion, useReducedMotion, useReducedMotionConfig } from "framer-motion";
import { scaleLinear } from "d3-scale";
import { curveStepAfter, line } from "d3-shape";
import { cn } from "@/brand/cn";
import { ToParFigure } from "@/brand/components/ToParFigure";
import { paddedExtent } from "@/brand/charts/scales";
import { scoreKindLabel, scoreWashClass, toParFill, toParLabel, tokens } from "@/brand/theme";
import type { HoleScore, Round } from "@/domain";
import { pluralize } from "@/domain/format";
import type { ScoreKind } from "@/domain/score";

interface RoundFlowChartProps {
  round: Round;
}

/** A hole that can be plotted: scored, with a par the server classified it against. */
type FlowHole = HoleScore & { strokes: number; toPar: number; kind: ScoreKind };

/** A plotted hole with the round's score to par after it. */
type FlowStep = FlowHole & { total: number };

const DASH = `${tokens.space.dot} ${tokens.space.dot}`;

// TODO(backend): the running total and the worst stretch are round figures the API should send.

/** Each hole with the round's to-par after it. */
function withRunningTotal(holes: FlowHole[]): FlowStep[] {
  let total = 0;
  return holes.map((hole) => ({ ...hole, total: (total += hole.toPar) }));
}

/** The four straight holes that lost the most, when they lost two or more. */
function worstStretch(steps: FlowStep[]) {
  let worst: { from: number; to: number; over: number } | null = null;
  for (let i = 3; i < steps.length; i++) {
    const from = steps[i - 3].hole;
    const to = steps[i].hole;
    const over = steps[i].total - (steps[i - 4]?.total ?? 0);
    if (to - from === 3 && over >= 2 && over > (worst?.over ?? 0)) worst = { from, to, over };
  }
  return worst;
}

/**
 * How a round went, as a running score: the total to par after each hole, drawn as a step
 * that climbs on a bad hole and falls on a good one. Each hole's own score sits in a
 * square under its step, and the worst four-hole stretch is bracketed.
 * Wider than a phone, so the plot scrolls sideways rather than shrinking its labels.
 */
export function RoundFlowChart({ round }: RoundFlowChartProps) {
  const { width: W, height: H, pad: PAD, stroke, dot, labelGap, chip, bracket } = tokens.chart.flow;
  const chipSize = tokens.size["hole-h"];
  // The OS setting, or a MotionConfig asking for stillness (the kit's screenshot harness).
  const prefersReduced = useReducedMotion();
  const configReduced = useReducedMotionConfig();
  const reduceMotion = prefersReduced || configReduced;
  const [hovered, setHovered] = useState<FlowStep | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const played = round.holes.filter(
    (hole): hole is FlowHole => hole.strokes != null && hole.toPar != null && hole.kind != null,
  );
  if (played.length < 3) return null;

  const steps = withRunningTotal(played);
  const first = steps[0].hole;
  const last = steps[steps.length - 1].hole;
  const final = steps[steps.length - 1];

  const bottom = H - PAD.bottom;
  // Each hole owns a column from x(hole) to x(hole + 1).
  const x = scaleLinear().domain([first, last + 1]).range([PAD.left, W - PAD.right]);
  const mid = (hole: number) => x(hole + 0.5);
  // The line starts at level, so level is always on the scale, with a stroke of room either side.
  const y = scaleLinear()
    .domain(paddedExtent([0, ...steps.map((step) => step.total)], 1)!)
    .range([bottom, PAD.top]);
  const ticks = y.ticks(4).filter(Number.isInteger);

  const path =
    line().curve(curveStepAfter)([
      [x(first), y(0)],
      ...steps.map((step): [number, number] => [x(step.hole), y(step.total)]),
      [x(last + 1), y(final.total)],
    ]) ?? "";

  const worst = worstStretch(steps);
  const bracketY = PAD.top - bracket.rise;
  const chipTop = bottom + chip.gap;

  const figures = [
    { label: "Out", toPar: round.frontNine.toPar },
    { label: "In", toPar: round.backNine.toPar },
    { label: "Total", toPar: round.toPar },
  ];

  const handleMouseMove = (e: MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const hole = Math.floor(x.invert((e.clientX - rect.left) * (W / rect.width)));
    setHovered(steps.find((step) => step.hole === Math.max(first, Math.min(last, hole))) ?? null);
    setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const description =
    `Running score to par: ${toParLabel(final.total)} after hole ${last}` +
    (worst ? `, ${toParLabel(worst.over)} over holes ${worst.from} to ${worst.to}` : "");

  return (
    <div data-slot="round-flow-chart" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-x-5 gap-y-2">
        <div>
          <div className="text-base font-semibold text-card-foreground">Round flow</div>
          <div className="mt-0.5 text-body-sm text-muted-foreground">Running score to par, hole by hole</div>
        </div>
        <div className="flex gap-5 text-body-sm text-foreground-secondary">
          {figures.map((figure) => (
            <div key={figure.label}>
              {figure.label} <ToParFigure toPar={figure.toPar} />
            </div>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="relative min-w-chart-wide select-none">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            role="img"
            aria-label={description}
            className="block w-full overflow-visible"
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setHovered(null)}
          >
            {worst && (
              <g>
                <path
                  d={`M${x(worst.from) + tokens.space.dot} ${bracketY + bracket.tick} V${bracketY} H${x(worst.to + 1) - tokens.space.dot} V${bracketY + bracket.tick}`}
                  fill="none"
                  stroke={toParFill(worst.over)}
                  strokeWidth={tokens.lineWidth.outline}
                  strokeLinejoin="round"
                />
                <text
                  x={x((worst.from + worst.to + 1) / 2)}
                  y={bracketY - bracket.tick}
                  textAnchor="middle"
                  fontSize={tokens.type.label.size}
                  fontFamily={tokens.font.sans}
                  fontWeight="600"
                  fill={toParFill(worst.over)}
                >
                  {toParLabel(worst.over)} over holes {worst.from}–{worst.to}
                </text>
              </g>
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
                  strokeDasharray={tick === 0 ? DASH : undefined}
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
                  {toParLabel(tick)}
                </text>
              </g>
            ))}

            {first <= 9 && last > 9 && (
              <line
                x1={x(10)}
                x2={x(10)}
                y1={0}
                y2={H}
                stroke={tokens.color.border}
                strokeWidth={tokens.lineWidth.border}
              />
            )}

            <motion.path
              d={path}
              fill="none"
              stroke={tokens.color.foreground}
              strokeWidth={stroke}
              strokeLinejoin="round"
              // Reduced motion starts at the end state, so there is nothing left to animate.
              initial={reduceMotion ? false : { pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={tokens.motion.draw}
            />
            <circle cx={x(last + 1)} cy={y(final.total)} r={dot} fill={tokens.color.foreground} />
            <text
              x={x(last + 1)}
              y={y(final.total) - labelGap}
              textAnchor="end"
              fontSize={tokens.type["body-sm"].size}
              fontFamily={tokens.font.sans}
              fontWeight="700"
              fill={toParFill(final.total)}
            >
              {toParLabel(final.total)}
            </text>

            {hovered && (
              <>
                <line
                  x1={mid(hovered.hole)}
                  x2={mid(hovered.hole)}
                  y1={PAD.top}
                  y2={bottom}
                  stroke={tokens.color.chart.reference}
                  strokeWidth={tokens.lineWidth.border}
                  strokeDasharray={DASH}
                />
                <circle
                  cx={mid(hovered.hole)}
                  cy={y(hovered.total)}
                  r={dot}
                  fill={tokens.color.foreground}
                  stroke={tokens.color.card}
                  strokeWidth={tokens.lineWidth.outline}
                />
              </>
            )}

            {steps.map((step) => (
              <g key={step.hole}>
                <rect
                  x={mid(step.hole) - chipSize / 2}
                  y={chipTop}
                  width={chipSize}
                  height={chipSize}
                  rx={step.toPar < 0 ? chipSize / 2 : chip.radius}
                  fill={tokens.color.score[step.kind].base}
                />
                <text
                  x={mid(step.hole)}
                  y={chipTop + chipSize / 2}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={tokens.type.label.size}
                  fontFamily={tokens.font.sans}
                  fontWeight="700"
                  fill={tokens.color.score[step.kind].onBase}
                >
                  {step.strokes}
                </text>
                <text
                  x={mid(step.hole)}
                  y={chipTop + chipSize + chip.gap}
                  textAnchor="middle"
                  fontSize={tokens.type.meta.size}
                  fontFamily={tokens.font.sans}
                  fill={hovered?.hole === step.hole ? tokens.color.foreground : tokens.color.mutedForeground}
                  fontWeight={hovered?.hole === step.hole ? "600" : "400"}
                >
                  {step.hole}
                </text>
              </g>
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
                <div className="mt-1 text-muted-foreground">
                  Round <ToParFigure toPar={hovered.total} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

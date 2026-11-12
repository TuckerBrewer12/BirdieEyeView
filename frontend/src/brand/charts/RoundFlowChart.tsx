import { useCallback, useState, type MouseEvent } from "react";
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
import { HoleShape } from "./HoleScoreShapes";

interface RoundFlowChartProps {
  round: Round;
}

/** A hole on the flow: scored, classified, and with the round's to par after it, all the server's. */
type FlowHole = HoleScore & { strokes: number; toPar: number; kind: ScoreKind; runningToPar: number };

/**
 * How a round went, as a running score: the server's total to par after each hole, drawn as a
 * step that climbs on a bad hole and falls on a good one. Each hole's own score is marked under
 * its step, the way the scorecard marks it, and the server's worst four-hole stretch is bracketed.
 * It fills its card; narrower than a phone allows, the plot scrolls sideways rather than shrinking its labels.
 */
export function RoundFlowChart({ round }: RoundFlowChartProps) {
  const { width, minWidth, height: H, pad: PAD, stroke, dot, labelGap, chip, bracket } = tokens.chart.flow;
  // The plot is drawn at the width it has, so its labels keep their size: a wide card spreads the
  // holes, a narrow one packs them down to `minWidth` and then scrolls.
  const [measured, setMeasured] = useState<number | null>(null);
  const measure = useCallback((node: HTMLDivElement | null) => {
    if (!node || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => setMeasured(entry.contentRect.width));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  const W = Math.max(minWidth, measured ?? width);
  // The strip's marks are square, a `hole-h` side.
  const holeW = tokens.size["hole-h"];
  const holeH = tokens.size["hole-h"];
  // The OS setting, or a MotionConfig asking for stillness (the kit's screenshot harness).
  const prefersReduced = useReducedMotion();
  const configReduced = useReducedMotionConfig();
  const reduceMotion = prefersReduced || configReduced;
  const [hovered, setHovered] = useState<FlowHole | null>(null);

  const steps = round.holes.filter(
    (hole): hole is FlowHole =>
      hole.strokes != null && hole.toPar != null && hole.kind != null && hole.runningToPar != null,
  );
  if (steps.length < 3) return null;

  const first = steps[0].hole;
  const last = steps[steps.length - 1].hole;
  const final = steps[steps.length - 1];

  const bottom = H - PAD.bottom;
  // Each hole owns a column from x(hole) to x(hole + 1).
  const x = scaleLinear().domain([first, last + 1]).range([PAD.left, W - PAD.right]);
  const mid = (hole: number) => x(hole + 0.5);
  // The line starts at level, so level is always on the scale, with a stroke of room either side.
  const y = scaleLinear()
    .domain(paddedExtent([0, ...steps.map((step) => step.runningToPar)], 1)!)
    .range([bottom, PAD.top]);
  const ticks = y.ticks(4).filter(Number.isInteger);

  const path =
    line().curve(curveStepAfter)([
      [x(first), y(0)],
      ...steps.map((step): [number, number] => [x(step.hole), y(step.runningToPar)]),
      [x(last + 1), y(final.runningToPar)],
    ]) ?? "";

  const worst = round.worstStretch;
  const bracketY = PAD.top - bracket.rise;
  const chipTop = bottom + chip.gap;

  const handleMouseMove = (e: MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const hole = Math.floor(x.invert((e.clientX - rect.left) * (W / rect.width)));
    setHovered(steps.find((step) => step.hole === Math.max(first, Math.min(last, hole))) ?? null);
  };

  const description =
    `Running score to par: ${toParLabel(final.runningToPar)} after hole ${last}` +
    (worst ? `, ${toParLabel(worst.toPar)} over holes ${worst.firstHole} to ${worst.lastHole}` : "");

  return (
    <div data-slot="round-flow-chart">
      <div ref={measure} className="overflow-x-auto">
        <div className="relative min-w-chart-flow select-none">
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
                  d={`M${x(worst.firstHole) + tokens.space.dot} ${bracketY + bracket.tick} V${bracketY} H${x(worst.lastHole + 1) - tokens.space.dot} V${bracketY + bracket.tick}`}
                  fill="none"
                  stroke={toParFill(worst.toPar)}
                  strokeWidth={tokens.lineWidth.outline}
                  strokeLinejoin="round"
                />
                <text
                  x={x((worst.firstHole + worst.lastHole + 1) / 2)}
                  y={bracketY - bracket.tick}
                  textAnchor="middle"
                  fontSize={tokens.type.label.size}
                  fontFamily={tokens.font.sans}
                  fontWeight="600"
                  fill={toParFill(worst.toPar)}
                >
                  {toParLabel(worst.toPar)} over holes {worst.firstHole}–{worst.lastHole}
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
            <circle cx={x(last + 1)} cy={y(final.runningToPar)} r={dot} fill={tokens.color.foreground} />
            <text
              x={x(last + 1)}
              y={y(final.runningToPar) - labelGap}
              textAnchor="end"
              fontSize={tokens.type["body-sm"].size}
              fontFamily={tokens.font.sans}
              fontWeight="700"
              fill={toParFill(final.runningToPar)}
            >
              {toParLabel(final.runningToPar)}
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
                  strokeDasharray={tokens.chart.guideDash}
                />
                <circle
                  cx={mid(hovered.hole)}
                  cy={y(hovered.runningToPar)}
                  r={dot}
                  fill={tokens.color.foreground}
                  stroke={tokens.color.card}
                  strokeWidth={tokens.lineWidth.outline}
                />
              </>
            )}

            {steps.map((step) => (
              <g key={step.hole}>
                {/* The scorecard's own hole mark, so a score reads the same here as on the card. */}
                <foreignObject x={mid(step.hole) - holeW / 2} y={chipTop} width={holeW} height={holeH} pointerEvents="none">
                  <div className="pointer-events-none flex">
                    <HoleShape hole={step} square />
                  </div>
                </foreignObject>
                <text
                  x={mid(step.hole)}
                  y={chipTop + holeH + chip.gap}
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
                className={cn(
                  "pointer-events-none absolute z-10 min-w-32 -translate-y-full rounded-xl border border-border bg-card/glass px-3 py-2.5 text-body-sm shadow-card",
                  // Past two thirds of the way across, the card opens to the left of the hole.
                  mid(hovered.hole) > W * 0.65 ? "-ml-3 -translate-x-full" : "ml-3",
                )}
                style={{
                  left: `${(mid(hovered.hole) / W) * 100}%`,
                  top: `${(y(hovered.runningToPar) / H) * 100}%`,
                }}
                initial={{ opacity: 0, scale: tokens.motion.tapScale }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: tokens.motion.tapScale }}
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
                  Round <ToParFigure toPar={hovered.runningToPar} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

/** The round's to par out, in and in total, as the server sent them: what the flow ends on, for its card's header. */
export function RoundFlowFigures({ round }: RoundFlowChartProps) {
  const figures = [
    { label: "Out", toPar: round.frontNine.toPar },
    { label: "In", toPar: round.backNine.toPar },
    { label: "Total", toPar: round.toPar },
  ];
  return (
    <div data-slot="round-flow-figures" className="flex gap-5 text-body-sm text-foreground-secondary">
      {figures.map((figure) => (
        <div key={figure.label}>
          {figure.label} <ToParFigure toPar={figure.toPar} />
        </div>
      ))}
    </div>
  );
}

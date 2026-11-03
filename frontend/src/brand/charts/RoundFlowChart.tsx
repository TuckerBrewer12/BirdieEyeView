import { useState, type MouseEvent } from "react";
import { AnimatePresence, motion, useReducedMotion, useReducedMotionConfig } from "framer-motion";
import { cn } from "@/brand/cn";
import { scoreKindLabel, scoreWashClass, toParLabel, tokens } from "@/brand/theme";
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

interface Stretch {
  from: number;
  to: number;
  over: number;
}

/** Over par reads as danger, under par as birdie, level as plain ink. */
function toParText(toPar: number): string {
  return toPar > 0 ? "text-status-danger" : toPar < 0 ? "text-score-birdie" : "text-foreground";
}

function toParFill(toPar: number): string {
  return toPar > 0
    ? tokens.color.status.danger.text
    : toPar < 0
      ? tokens.color.score.birdie.text
      : tokens.color.foreground;
}

/** The holes' to-par added up as they were played. */
function withRunningTotal(holes: FlowHole[]): FlowStep[] {
  let total = 0;
  return holes.map((hole) => {
    total += hole.toPar;
    return { ...hole, total };
  });
}

/** The first run of consecutive holes, `holes` long, that lost the most strokes. Null if none lost enough. */
function worstStretch(steps: FlowStep[]): Stretch | null {
  const { holes, minOver } = tokens.chart.flow.stretch;
  let worst: Stretch | null = null;
  for (let i = 0; i + holes <= steps.length; i++) {
    const run = steps.slice(i, i + holes);
    if (run[holes - 1].hole - run[0].hole !== holes - 1) continue;
    const over = run.reduce((sum, step) => sum + step.toPar, 0);
    if (over >= minOver && (worst === null || over > worst.over)) {
      worst = { from: run[0].hole, to: run[holes - 1].hole, over };
    }
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
  const { width: W, height: H, pad: PAD, stroke, dot, chip, divider, bracket } = tokens.chart.flow;
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
  const columns = last - first + 1;

  const left = PAD.left;
  const right = W - PAD.right;
  const top = PAD.top;
  const bottom = H - PAD.bottom;
  const columnWidth = (right - left) / columns;
  const columnStart = (hole: number) => left + (hole - first) * columnWidth;
  const columnMid = (hole: number) => columnStart(hole) + columnWidth / 2;

  // Even numbers up the side, with a stroke of room below level so the par line is not the floor.
  const totals = steps.map((step) => step.total);
  const evenCeil = (n: number) => 2 * Math.ceil(n / 2);
  const evenFloor = (n: number) => 2 * Math.floor(n / 2);
  const hi = Math.max(4, evenCeil(Math.max(...totals)));
  const lo = Math.min(-1, evenFloor(Math.min(...totals)));
  const tickStep = 2 * Math.ceil((hi - lo) / 12);
  const ticks: number[] = [];
  for (let tick = Math.ceil(lo / tickStep) * tickStep; tick <= hi; tick += tickStep) ticks.push(tick);
  const y = (toPar: number) => top + ((hi - toPar) / (hi - lo)) * (bottom - top);

  let path = `M${left} ${y(0)}`;
  for (const step of steps) {
    path += ` H${columnStart(step.hole)} V${y(step.total)} H${columnStart(step.hole + 1)}`;
  }

  const final = steps[steps.length - 1];
  const endX = columnStart(last + 1);
  const worst = worstStretch(steps);
  const bracketY = top - bracket.rise;
  const chipTop = bottom + chip.gap;
  const numberY = chipTop + chip.size + chip.gap;
  const dividerX = columnStart(10);

  const figures = [
    { label: "Out", toPar: round.frontNine.toPar },
    { label: "In", toPar: round.backNine.toPar },
    { label: "Total", toPar: round.toPar },
  ].filter((figure): figure is { label: string; toPar: number } => figure.toPar != null);

  const handleMouseMove = (e: MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const column = Math.floor(((e.clientX - rect.left) * (W / rect.width) - left) / columnWidth) + first;
    setHovered(steps.find((step) => step.hole === Math.max(first, Math.min(last, column))) ?? null);
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
              {figure.label} <b className={toParText(figure.toPar)}>{toParLabel(figure.toPar)}</b>
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
                  d={`M${columnStart(worst.from) + bracket.inset} ${bracketY + bracket.tick} V${bracketY} H${columnStart(worst.to + 1) - bracket.inset} V${bracketY + bracket.tick}`}
                  fill="none"
                  stroke={tokens.color.status.danger.text}
                  strokeWidth={bracket.stroke}
                  strokeLinejoin="round"
                />
                <text
                  x={(columnStart(worst.from) + columnStart(worst.to + 1)) / 2}
                  y={bracketY - bracket.tick}
                  textAnchor="middle"
                  fontSize={tokens.type.label.size}
                  fontFamily={tokens.font.sans}
                  fontWeight="600"
                  fill={tokens.color.status.danger.text}
                >
                  {toParLabel(worst.over)} over holes {worst.from}–{worst.to}
                </text>
              </g>
            )}

            {ticks.map((tick) => (
              <g key={tick}>
                <line
                  x1={left}
                  x2={right}
                  y1={y(tick)}
                  y2={y(tick)}
                  stroke={tick === 0 ? tokens.color.chart.reference : tokens.color.chart.grid}
                  strokeWidth={tokens.lineWidth.border}
                  strokeDasharray={tick === 0 ? "3 4" : undefined}
                />
                <text
                  x={left - 10}
                  y={y(tick) + 4}
                  textAnchor="end"
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
                x1={dividerX}
                x2={dividerX}
                y1={top - divider.top}
                y2={H - divider.bottom}
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
            <circle cx={endX} cy={y(final.total)} r={dot} fill={tokens.color.foreground} />
            <text
              x={endX}
              y={y(final.total) - 10}
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
                  x1={columnMid(hovered.hole)}
                  x2={columnMid(hovered.hole)}
                  y1={top}
                  y2={bottom}
                  stroke={tokens.color.chart.reference}
                  strokeWidth={tokens.lineWidth.border}
                  strokeDasharray="3 3"
                />
                <circle
                  cx={columnMid(hovered.hole)}
                  cy={y(hovered.total)}
                  r={dot}
                  fill={tokens.color.foreground}
                  stroke={tokens.color.card}
                  strokeWidth={tokens.lineWidth.outline}
                />
              </>
            )}

            {steps.map((step) => {
              const level = step.kind === "par";
              return (
                <g key={step.hole}>
                  <rect
                    x={columnMid(step.hole) - chip.size / 2}
                    y={chipTop}
                    width={chip.size}
                    height={chip.size}
                    rx={step.toPar < 0 ? chip.size / 2 : chip.radius}
                    fill={level ? tokens.color.muted : tokens.color.score[step.kind].base}
                  />
                  <text
                    x={columnMid(step.hole)}
                    y={chipTop + chip.size / 2}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={tokens.type.label.size}
                    fontFamily={tokens.font.sans}
                    fontWeight="700"
                    fill={level ? tokens.color.foregroundSecondary : tokens.color.score[step.kind].onBase}
                  >
                    {step.strokes}
                  </text>
                  <text
                    x={columnMid(step.hole)}
                    y={numberY}
                    textAnchor="middle"
                    fontSize={tokens.type.meta.size}
                    fontFamily={tokens.font.sans}
                    fill={hovered?.hole === step.hole ? tokens.color.foreground : tokens.color.mutedForeground}
                    fontWeight={hovered?.hole === step.hole ? "600" : "400"}
                  >
                    {step.hole}
                  </text>
                </g>
              );
            })}
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
                <div className="mt-1 text-muted-foreground">Round {toParLabel(hovered.total)}</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

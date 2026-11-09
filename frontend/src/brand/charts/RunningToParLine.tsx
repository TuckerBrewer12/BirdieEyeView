import { scaleLinear } from "d3-scale";
import { curveBumpX, line } from "d3-shape";
import { cn } from "@/brand/cn";
import { toParLabel, tokens } from "@/brand/theme";
import type { RunningToPar } from "@/domain";
import { indexScale } from "./scales";

interface RunningToParLineProps {
  /** The round's to par after each hole, in hole order, as the server ran it. */
  flow: RunningToPar[];
  /** The phone's shorter line, with no figures round it. */
  compact?: boolean;
  className?: string;
}

const R = tokens.chart.running;

/**
 * How a round went: its running score to par from the first tee, a smooth line over a dotted
 * level line, ending on a dot. The wide one marks level, the turn, the last hole and the finish.
 */
export function RunningToParLine({ flow, compact = false, className }: RunningToParLineProps) {
  if (flow.length < 2) return null;

  const W = compact ? R.widthCompact : R.width;
  const H = compact ? R.heightCompact : R.height;
  const values = flow.map((point) => point.toPar);
  // A stroke of room above the worst and below the best, and level always on the plot.
  const y = scaleLinear()
    .domain([Math.min(0, ...values) - 1, Math.max(0, ...values) + 1])
    .range(compact ? [R.bottomCompact, R.topCompact] : [R.bottom, R.top]);
  const x = indexScale(flow.length, compact ? R.firstCompact : R.first, compact ? R.lastCompact : R.last);

  // The line leaves level at the edge, before the first hole.
  const points: [number, number][] = [[0, y(0)], ...flow.map((point, i): [number, number] => [x(i), y(point.toPar)])];
  const path = line().curve(curveBumpX)(points) ?? "";
  const last = flow.length - 1;
  const end = flow[last];
  const turn = flow.findIndex((point) => point.hole === 9);
  const label = `Running score to par, finishing ${toParLabel(end.toPar) ?? "level"}`;
  const caption = { fontSize: tokens.type.label.size, fontWeight: 500, fill: tokens.color.mutedForeground };

  return (
    <div data-slot="running-to-par-line" className={cn("w-full", className)}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} className="block h-auto w-full overflow-visible">
        <line
          x1={0}
          x2={W}
          y1={y(0)}
          y2={y(0)}
          stroke={tokens.color.borderStrong}
          strokeWidth={R.level}
          strokeDasharray={R.levelDash}
          strokeLinecap="round"
        />
        <path d={path} fill="none" stroke={tokens.color.primary} strokeWidth={R.stroke} strokeLinecap="round" strokeLinejoin="round" />
        <circle
          cx={x(last)}
          cy={y(end.toPar)}
          r={compact ? R.dotCompact : R.dot}
          fill={tokens.color.primary}
          stroke={tokens.color.card}
          strokeWidth={compact ? R.rimCompact : R.rim}
        />
        {!compact && (
          <g>
            <text x={0} y={y(0) + R.levelDrop} {...caption} fontSize={tokens.type["body-sm"].size}>
              {toParLabel(0)}
            </text>
            <text
              x={W}
              y={y(end.toPar) - R.closeLift}
              textAnchor="end"
              fontSize={tokens.type["body-lg"].size}
              fontWeight={600}
              fill={tokens.color.foreground}
            >
              {toParLabel(end.toPar)}
            </text>
            {turn > 0 && turn < last && (
              <text x={x(turn)} y={H} textAnchor="middle" {...caption}>
                Turn
              </text>
            )}
            <text x={W} y={H} textAnchor="end" {...caption}>
              {end.hole}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}

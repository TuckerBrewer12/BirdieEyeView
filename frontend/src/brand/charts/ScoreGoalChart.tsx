import { scaleLinear } from "d3-scale";
import { cn } from "@/brand/cn";
import { chartColors, chartLayout, chartTickStyle, colors, space } from "@/brand/theme";
import { indexScale, paddedExtent } from "./scales";

interface ScoreGoalChartProps {
  /** Scores, oldest first. */
  scores: number[];
  /** The highest score that meets the goal: 79 to break 80. */
  goal: number;
  className?: string;
  "aria-label"?: string;
}

/**
 * Rounds against a scoring goal: one dot per round, lower scores higher up, joined by a
 * faint line, with the goal dashed across. A round at or under the goal is filled.
 */
export function ScoreGoalChart({ scores, goal, className, "aria-label": ariaLabel }: ScoreGoalChartProps) {
  const { width: W, height: H, pad, labelRoom, dot, dotReached } = chartLayout.goal;

  if (scores.length < 2) {
    return <div className="py-6 text-center text-sm text-muted-foreground">Not enough rounds yet</div>;
  }

  const x = indexScale(scores.length, pad.x, W - pad.x);
  // A stroke of room past the lowest and highest, so no dot sits on the edge.
  const y = scaleLinear()
    .domain(paddedExtent([...scores, goal], 1)!)
    .range([pad.y, H - pad.y]);
  const goalY = y(goal);

  return (
    <div data-slot="score-goal-chart" className={cn("w-full", className)}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block h-auto w-full overflow-visible"
        role="img"
        aria-label={ariaLabel}
      >
        <line
          x1={pad.x}
          x2={W - pad.x - labelRoom}
          y1={goalY}
          y2={goalY}
          stroke={colors.primary}
          strokeWidth={1.5}
          strokeDasharray={`${space.dot} ${space.dot}`}
        />
        <text
          x={W - pad.x - labelRoom + 4}
          y={goalY + 4}
          fontSize={chartTickStyle.fontSize}
          fontWeight="600"
          fill={colors.primary}
        >
          Goal
        </text>
        <polyline
          points={scores.map((score, i) => `${x(i)},${y(score)}`).join(" ")}
          fill="none"
          stroke={chartColors.muted}
          strokeWidth={1.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {scores.map((score, i) => {
          const reached = score <= goal;
          return (
            <circle
              key={i}
              data-reached={reached || undefined}
              cx={x(i)}
              cy={y(score)}
              r={reached ? dotReached : dot}
              fill={reached ? colors.score.birdie.base : colors.card}
              stroke={reached ? "none" : chartColors.axis}
              strokeWidth={1.5}
            />
          );
        })}
      </svg>
    </div>
  );
}

export type { ScoreGoalChartProps };

import { scaleLinear } from "d3-scale";
import { cn } from "@/brand/cn";
import { EmptyNote } from "@/brand/components/EmptyNote";
import type { GoalAttempt } from "@/domain/benchmark";
import { chartTickStyle, tokens } from "@/brand/theme";
import { indexScale, paddedExtent } from "./scales";
import { useChartWidth } from "./useChartWidth";

interface ScoreGoalChartProps {
  /** Rounds, oldest first, each marked met or not as the server judged it. */
  attempts: GoalAttempt[];
  /** The highest score that meets the goal, 79 to break 80: where the goal line is drawn. */
  goal: number;
  /** The goal's words at the end of its line: "Break 80". */
  goalLabel?: string;
  /** Each round's score over its dot, the ones that met the goal in bold. */
  scoreLabels?: boolean;
  className?: string;
  "aria-label"?: string;
}

/**
 * Rounds against a scoring goal: one dot per round, lower scores higher up, joined by a
 * faint line, with the goal dashed across and named at its end, past the last round. A round that met the goal is
 * filled; with `scoreLabels` each dot carries its score. It draws at its box's width, so the labels keep their size.
 */
export function ScoreGoalChart({
  attempts,
  goal,
  goalLabel = "Goal",
  scoreLabels = false,
  className,
  "aria-label": ariaLabel,
}: ScoreGoalChartProps) {
  const { width, minWidth, height: H, pad, labelRoom, stroke, dot, dotReached } = tokens.chart.goal;
  const [W, measureRef] = useChartWidth(width, minWidth);

  if (attempts.length < 2) {
    return <EmptyNote className="py-6">Not enough rounds yet</EmptyNote>;
  }

  const scores = attempts.map((attempt) => attempt.score);
  const x = indexScale(scores.length, pad.x, W - pad.x - labelRoom);
  // A stroke of room past the lowest and highest, so no dot sits on the edge.
  const y = scaleLinear()
    .domain(paddedExtent([...scores, goal], 1)!)
    .range([pad.y, H - pad.y]);
  const goalY = y(goal);
  // The line runs just past the last round's dot; its name sits after it.
  const lineEnd = W - pad.x - labelRoom + dotReached;

  return (
    <div ref={measureRef} data-slot="score-goal-chart" className={cn("w-full", className)}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block h-auto w-full overflow-visible"
        role="img"
        aria-label={ariaLabel}
      >
        <line
          x1={pad.x}
          x2={lineEnd}
          y1={goalY}
          y2={goalY}
          stroke={tokens.color.primary}
          strokeWidth={stroke}
          strokeDasharray={tokens.chart.guideDash}
        />
        <text
          x={lineEnd + tokens.space.dot}
          y={goalY + tokens.space.dot}
          textAnchor="start"
          fontSize={chartTickStyle.fontSize}
          fontWeight="700"
          fill={tokens.color.primary}
        >
          {goalLabel}
        </text>
        <polyline
          points={scores.map((score, i) => `${x(i)},${y(score)}`).join(" ")}
          fill="none"
          stroke={tokens.color.chart.muted}
          strokeWidth={stroke}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {attempts.map(({ score, metGoal }, i) => (
          <circle
            key={i}
            data-reached={metGoal || undefined}
            cx={x(i)}
            cy={y(score)}
            r={metGoal ? dotReached : dot}
            fill={metGoal ? tokens.color.score.birdie.base : tokens.color.card}
            stroke={metGoal ? "none" : tokens.color.chart.axis}
            strokeWidth={stroke}
          />
        ))}
        {scoreLabels &&
          attempts.map(({ score, metGoal }, i) => (
            <text
              key={i}
              x={x(i)}
              y={y(score) - dotReached - tokens.space.dot}
              textAnchor="middle"
              fontSize={chartTickStyle.fontSize}
              fontWeight={metGoal ? "700" : "500"}
              fill={metGoal ? tokens.color.score.birdie.text : tokens.color.mutedForeground}
            >
              {score}
            </text>
          ))}
      </svg>
    </div>
  );
}

export type { ScoreGoalChartProps };

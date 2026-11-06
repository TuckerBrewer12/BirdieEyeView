import { scaleLinear } from "d3-scale";
import { cn } from "@/brand/cn";
import type { GoalAttempt } from "@/domain/benchmark";
import { chartTickStyle, tokens } from "@/brand/theme";
import { indexScale, paddedExtent } from "./scales";

interface ScoreGoalChartProps {
  attempts: GoalAttempt[];
  goal: number;
  className?: string;
  "aria-label"?: string;
}

export function ScoreGoalChart({ attempts, goal, className, "aria-label": ariaLabel }: ScoreGoalChartProps) {
  const { width: W, height: H, pad, labelRoom, stroke, dot, dotReached } = tokens.chart.goal;

  if (attempts.length < 2) {
    return <div className="py-6 text-center text-sm text-muted-foreground">Not enough rounds yet</div>;
  }

  const scores = attempts.map((attempt) => attempt.score);
  const x = indexScale(scores.length, pad.x, W - pad.x);
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
          stroke={tokens.color.primary}
          strokeWidth={stroke}
          strokeDasharray={tokens.chart.guideDash}
        />
        <text
          x={W - pad.x - labelRoom + 4}
          y={goalY + 4}
          fontSize={chartTickStyle.fontSize}
          fontWeight="600"
          fill={tokens.color.primary}
        >
          Goal
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
      </svg>
    </div>
  );
}

export type { ScoreGoalChartProps };

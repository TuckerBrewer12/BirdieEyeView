import { ScoreGoalChart } from "@/brand/charts/ScoreGoalChart";
import type { GoalAttempt } from "@/domain/benchmark";

const attempts = (rounds: [number, boolean][]): GoalAttempt[] =>
  rounds.map(([score, metGoal], i) => ({ roundId: `round-${i + 1}`, score, metGoal }));

export default function ScoreGoalChartPreview() {
  return (
    <>
      <ScoreGoalChart
        attempts={attempts([
          [96, false], [92, false], [89, true], [94, false], [91, false],
          [87, true], [93, false], [90, false], [88, true], [95, false],
        ])}
        goal={89}
        goalLabel="Break 90"
        scoreLabels
      />
      <ScoreGoalChart attempts={attempts([[88, false], [85, false], [91, false], [86, false]])} goal={79} />
      <ScoreGoalChart attempts={attempts([[84, false]])} goal={79} />
    </>
  );
}

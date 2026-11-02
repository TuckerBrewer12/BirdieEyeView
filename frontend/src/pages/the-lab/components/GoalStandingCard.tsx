import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Meter,
  Stat,
  StatLabel,
  StatValue,
} from "@/brand";
import { formatOneDecimal, goalScoreToBreak, goalTargetLabel } from "@/domain";
import type { GoalStanding } from "../model";
import { goalStandingNote } from "../present";

interface GoalStandingCardProps {
  /** Null until a goal is set. */
  goal: GoalStanding | null;
  className?: string;
}

/** How close the golfer's average is to their goal, from the server's goal report. */
export function GoalStandingCard({ goal, className }: GoalStandingCardProps) {
  if (!goal) {
    return (
      <Card data-slot="goal-standing" className={className}>
        <CardHeader>
          <CardTitle>No goal yet</CardTitle>
          <CardDescription>
            Pick a goal above to see how close you are and where to find the strokes.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const label = goalTargetLabel(goal.target);

  return (
    <Card data-slot="goal-standing" className={className}>
      <CardHeader>
        <CardTitle>{label}</CardTitle>
        <CardDescription>Your last 20 rounds against a {goalScoreToBreak(goal.target)}.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {goal.average == null ? (
          <p className="text-sm text-muted-foreground">Play a few rounds to see how close you are.</p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3">
              <Stat>
                <StatLabel>Average</StatLabel>
                <StatValue size="lg">{formatOneDecimal(goal.average)}</StatValue>
              </Stat>
              <Stat>
                <StatLabel>Best</StatLabel>
                <StatValue size="lg">{goal.bestScore ?? "—"}</StatValue>
              </Stat>
              <Stat>
                <StatLabel>Gap</StatLabel>
                <StatValue size="lg" className={goal.onTrack ? "text-score-birdie" : undefined}>
                  {goal.gap != null ? formatOneDecimal(Math.max(0, goal.gap)) : "—"}
                </StatValue>
              </Stat>
            </div>
            <Meter
              value={goal.progressPct}
              tone={goal.onTrack ? "success" : "progress"}
              aria-label={`Progress to ${label.toLowerCase()}`}
            />
            <p className="text-sm text-muted-foreground">{goalStandingNote(goal)}</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

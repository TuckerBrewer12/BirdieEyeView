import { Card, CardTitle, Meter, PickerMenu, ScoreGoalChart, StatLabel, StatValue } from "@/brand";
import { cn } from "@/brand/cn";
import type { GoalStanding } from "../profileModel";
import { GOAL_MENU_OPTIONS, attemptsLabel, goalFigures, goalLabel } from "../profilePresent";

interface GoalCardProps {
  goal: GoalStanding | null;
  onGoalChange: (target: number) => void;
  saving: boolean;
}

/** The scores a goal chart shows: the last twelve. */
const ATTEMPTS_SHOWN = 12;

/**
 * The golfer's scoring goal: the menu to set it, their average, best and what's left to go, how far
 * along they are, and their last twelve scores against it.
 */
export function GoalCard({ goal, onGoalChange, saving }: GoalCardProps) {
  const label = goalLabel(goal?.target ?? null);
  const attempts = goal?.attempts.slice(-ATTEMPTS_SHOWN) ?? [];
  return (
    <Card size="lg" data-slot="goal-card" className="grid grid-cols-1 gap-5 px-(--card-spacing) md:grid-cols-analytics-goal md:gap-7">
      <div className="flex flex-col gap-3.5">
        <div className="flex items-center justify-between">
          <CardTitle level={2} className="text-body-lg font-semibold">
            Goal
          </CardTitle>
          <PickerMenu
            aria-label="Scoring goal"
            size="sm"
            label={label ?? "Pick a goal"}
            value={goal ? String(goal.target) : ""}
            options={GOAL_MENU_OPTIONS}
            disabled={saving}
            onChange={(value) => onGoalChange(Number(value))}
          />
        </div>
        {goal ? (
          <>
            <div className="grid grid-cols-3">
              {goalFigures(goal).map((figure) => (
                <div key={figure.label} className="flex flex-col gap-1.5">
                  <StatLabel>{figure.label}</StatLabel>
                  <StatValue
                    size="card-sm"
                    className={cn(figure.tone === "good" && "text-primary", figure.tone === "bad" && "text-score-bogey")}
                  >
                    {figure.value}
                  </StatValue>
                </div>
              ))}
            </div>
            <Meter value={goal.progressPct} aria-label={`Progress to ${label ?? "the goal"}`} />
          </>
        ) : (
          <p className="text-body text-muted-foreground">Pick a score to break and see how far off it you are.</p>
        )}
      </div>
      {goal && attempts.length > 0 && (
        <ScoreGoalChart
          attempts={attempts}
          goal={goal.target}
          goalLabel={label ?? undefined}
          scoreLabels
          aria-label={attemptsLabel(attempts.length, goal.target)}
          className="self-center"
        />
      )}
    </Card>
  );
}

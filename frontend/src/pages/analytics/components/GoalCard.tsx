import { Card, CardAction, CardHeader, CardTitle, Meter, PickerMenu, ScoreGoalChart, StatLabel, StatValue } from "@/brand";
import type { GoalStanding } from "../profileModel";
import { GOAL_COPY, GOAL_MENU_OPTIONS, attemptsLabel, goalFigures, goalLabel, goalProgressLabel } from "../profilePresent";

interface GoalCardProps {
  goal: GoalStanding | null;
  onGoalChange: (target: number) => void;
  saving: boolean;
}

/**
 * The golfer's scoring goal: the menu to set it, their average, best and what's left to go, how far
 * along they are, and their last twelve scores against it.
 */
export function GoalCard({ goal, onGoalChange, saving }: GoalCardProps) {
  const label = goalLabel(goal?.target ?? null);
  return (
    <Card size="lg" data-slot="goal-card" className="grid grid-cols-1 gap-5 px-(--card-spacing) md:grid-cols-analytics-goal md:gap-7">
      <div className="flex flex-col gap-3.5">
        {/* The card's own padding holds the columns, so the header takes none of its own. */}
        <CardHeader className="items-center px-0">
          <CardTitle level={2} className="text-body-lg font-semibold">
            {GOAL_COPY.title}
          </CardTitle>
          <CardAction className="self-center">
            <PickerMenu
              aria-label="Scoring goal"
              size="sm"
              label={label ?? GOAL_COPY.pick}
              value={goal ? String(goal.target) : ""}
              options={GOAL_MENU_OPTIONS}
              disabled={saving}
              onChange={(value) => onGoalChange(Number(value))}
            />
          </CardAction>
        </CardHeader>
        {goal ? (
          <>
            <div className="grid grid-cols-3">
              {goalFigures(goal).map((figure) => (
                <div key={figure.label} className="flex flex-col gap-1.5">
                  <StatLabel>{figure.label}</StatLabel>
                  <StatValue size="card-sm" tone={figure.tone}>
                    {figure.value}
                  </StatValue>
                </div>
              ))}
            </div>
            <Meter value={goal.progressPct} aria-label={goalProgressLabel(label)} />
          </>
        ) : (
          <p className="text-body text-muted-foreground">{GOAL_COPY.empty}</p>
        )}
      </div>
      {goal && goal.attempts.length > 0 && (
        <ScoreGoalChart
          attempts={goal.attempts}
          goal={goal.target}
          goalLabel={label ?? undefined}
          scoreLabels
          aria-label={attemptsLabel(goal.attempts.length, goal.target)}
          className="self-center"
        />
      )}
    </Card>
  );
}

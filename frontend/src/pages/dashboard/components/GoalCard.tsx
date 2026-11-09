import { Button, Card, Meter } from "@/brand";
import { cn } from "@/brand/cn";
import { formatOneDecimal, goalTargetLabel } from "@/domain";
import type { GoalProgress } from "../model";
import { goalNextLabel, goalStatusLabel } from "../present";

interface GoalCardProps {
  /** Null until a goal is set, which shows the prompt to set one. */
  goal: GoalProgress | null;
  onOpen: () => void;
  /** The phone's tighter padding. */
  compact?: boolean;
  className?: string;
}

/** The scoring goal, how close the player is, and what to work on next. Opens The Lab. */
export function GoalCard({ goal, onOpen, compact = false, className }: GoalCardProps) {
  const next = goal ? goalNextLabel(goal.focus) : null;
  return (
    <Card
      data-slot="goal-card"
      className={cn("cursor-pointer", compact ? "gap-2.5 px-4 py-3.5" : "gap-3 px-5 py-4.5", className)}
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
    >
      {goal ? (
        <>
          <div className="flex items-baseline justify-between">
            <div className="text-body-lg font-semibold text-foreground">{goalTargetLabel(goal.target)}</div>
            <div className={cn("text-body-sm font-semibold", goal.onTrack ? "text-score-birdie" : "text-muted-foreground")}>
              {goalStatusLabel(goal.onTrack)}
            </div>
          </div>
          <Meter value={goal.progressPct} aria-label={`Progress to ${goalTargetLabel(goal.target).toLowerCase()}`} />
          <div className="flex justify-between gap-3 text-body-sm text-foreground-secondary">
            <span>
              Avg <b className="font-semibold text-foreground">{formatOneDecimal(goal.average)}</b>
            </span>
            {next && <span className="truncate">{next}</span>}
          </div>
        </>
      ) : (
        <>
          <div className="text-body-lg font-semibold text-foreground">Scoring goal</div>
          <p className="text-body-sm text-foreground-secondary">Set a goal to see how close your rounds are.</p>
          <Button
            variant="link"
            size="sm"
            className="self-start px-0"
            onClick={(e) => {
              e.stopPropagation();
              onOpen();
            }}
          >
            Set a goal
          </Button>
        </>
      )}
    </Card>
  );
}

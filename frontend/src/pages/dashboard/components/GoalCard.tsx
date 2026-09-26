import { Button, Card, CardContent, chartColors, colors } from "@/brand";
import { cn } from "@/brand/cn";
import type { GoalProgress } from "@/domain";
import { goalTargetLabel } from "../present";

interface GoalCardProps {
  /** Null until a goal is set, which shows the prompt to set one. */
  goal: GoalProgress | null;
  onOpen: () => void;
  className?: string;
}

/** The scoring goal, how close the player is, and what to work on. Opens The Lab. */
export function GoalCard({ goal, onOpen, className }: GoalCardProps) {
  return (
    <Card
      data-slot="goal-card"
      className={cn("cursor-pointer", className)}
      size="sm"
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
      <CardContent>
        {goal ? (
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-meta font-bold uppercase tracking-eyebrow text-muted-foreground mb-0.5">Scoring Goal</div>
                <div className="text-sm font-bold text-card-foreground">
                  Target: {goalTargetLabel(goal.target)}
                </div>
              </div>
              <span className="text-label font-semibold text-primary">Goals →</span>
            </div>
            <div className="mb-3">
              <div className="flex justify-between text-meta text-muted-foreground mb-1">
                <span>{goal.average != null ? `Avg ${goal.average.toFixed(1)}` : null}</span>
                <span>Goal {goal.target + 1}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${goal.progressPct ?? 0}%`,
                    background: goal.onTrack
                      ? colors.score.birdie.base
                      : `linear-gradient(90deg, ${colors.primary}, ${chartColors.axis})`,
                  }}
                />
              </div>
            </div>
            {goal.focus && (
              <p className="text-label text-muted-foreground leading-relaxed">
                <span className="font-semibold text-secondary-foreground">Focus: </span>
                {goal.focus}
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-start justify-center h-full gap-2">
            <div className="text-meta font-bold uppercase tracking-eyebrow text-muted-foreground">Scoring Goal</div>
            <p className="text-sm text-muted-foreground">Set a scoring goal to track your progress.</p>
            <Button
              variant="link"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onOpen();
              }}
            >
              Set a goal →
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ScoreGoalChart,
  Stat,
  StatLabel,
  StatValue,
} from "@/brand";
import { cn } from "@/brand/cn";
import { goalTargetLabel, pluralize, type GoalAttempt } from "@/domain";
import { timesMetLabel } from "../present";

interface AttemptsCardProps {
  attempts: GoalAttempt[];
  target: number;
  timesMet: number | null;
  className?: string;
}

export function AttemptsCard({ attempts, target, timesMet, className }: AttemptsCardProps) {
  return (
    <Card data-slot="attempts-card" className={className}>
      <CardHeader>
        <CardTitle>Recent Attempts</CardTitle>
        <CardDescription className="flex items-center gap-1.5">
          <span aria-hidden className="size-2 rounded-full bg-score-birdie-base" />
          Filled rounds met the goal
        </CardDescription>
        <CardAction>
          <Stat align="end">
            <StatLabel>Times Achieved</StatLabel>
            <StatValue size="lg" className={cn(timesMet != null && timesMet > 0 && "text-score-birdie")}>
              {timesMet ?? "—"}
            </StatValue>
            {timesMet != null && (
              <span className="text-caption text-muted-foreground">{timesMetLabel(timesMet)}</span>
            )}
          </Stat>
        </CardAction>
      </CardHeader>
      <CardContent>
        <ScoreGoalChart
          attempts={attempts}
          goal={target}
          aria-label={`Your last ${pluralize(attempts.length, "score")} against ${goalTargetLabel(target).toLowerCase()}`}
        />
      </CardContent>
    </Card>
  );
}

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
import { goalTargetLabel, pluralize } from "@/domain";
import { timesMetLabel } from "../present";

interface AttemptsCardProps {
  /** Scores of the latest rounds, oldest first. */
  scores: number[];
  /** The goal as stored: 79 to break 80. */
  target: number;
  /** How many rounds in the window met it. */
  timesMet: number;
  className?: string;
}

/** The latest rounds against the goal, and how often it has been met. */
export function AttemptsCard({ scores, target, timesMet, className }: AttemptsCardProps) {
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
            <StatValue size="lg" className={cn(timesMet > 0 && "text-score-birdie")}>
              {timesMet}
            </StatValue>
            <span className="text-caption text-muted-foreground">{timesMetLabel(timesMet)}</span>
          </Stat>
        </CardAction>
      </CardHeader>
      <CardContent>
        <ScoreGoalChart
          scores={scores}
          goal={target}
          aria-label={`Your last ${pluralize(scores.length, "score")} against ${goalTargetLabel(target).toLowerCase()}`}
        />
      </CardContent>
    </Card>
  );
}

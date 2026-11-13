import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyNote,
  HandicapTrendChart,
  Stat,
  StatLabel,
  StatValue,
} from "@/brand";
import { formatHandicapIndex, type RoundTrendPoint } from "@/domain";
import { pluralize } from "@/domain/format";

interface HandicapTrendCardProps {
  /** The index after each round in the picked window, oldest first. */
  trend: RoundTrendPoint[];
  /** The golfer's index now, as the server worked it out, whatever the window. */
  handicapIndex: number | null;
  /** Shown in place of the line when the window has no rounds. */
  empty: string;
  /** The phone's narrower drawing. */
  compact?: boolean;
  className?: string;
}

/** The golfer's handicap index now, and how it has moved round by round over the picked window. */
export function HandicapTrendCard({
  trend,
  handicapIndex,
  empty,
  compact = false,
  className,
}: HandicapTrendCardProps) {
  return (
    <Card data-slot="handicap-trend-card" className={className}>
      <CardHeader>
        <CardTitle>Handicap Index Trend</CardTitle>
        <CardDescription>{pluralize(trend.length, "round")}</CardDescription>
        <CardAction>
          <Stat align="end">
            <StatLabel>HCP Index</StatLabel>
            <StatValue size={compact ? "md" : "lg"}>{formatHandicapIndex(handicapIndex)}</StatValue>
          </Stat>
        </CardAction>
      </CardHeader>
      <CardContent>
        {trend.length > 0 ? (
          <HandicapTrendChart data={trend} compact={compact} />
        ) : (
          <EmptyNote>{empty}</EmptyNote>
        )}
      </CardContent>
    </Card>
  );
}

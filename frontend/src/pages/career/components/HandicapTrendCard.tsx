import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  SVGScoreHandicapTrend,
  Stat,
  StatLabel,
  StatValue,
} from "@/brand";
import { formatHandicapIndex, type RoundTrendPoint } from "@/domain";
import { pluralize } from "@/domain/format";

interface HandicapTrendCardProps {
  /** The index after each round, oldest first. */
  trend: RoundTrendPoint[];
  /** The golfer's index now, as the server worked it out. */
  handicapIndex: number | null;
  roundCount: number;
  /** The phone's narrower drawing. */
  compact?: boolean;
  className?: string;
}

/** The golfer's handicap index now, and how it has moved round by round. */
export function HandicapTrendCard({
  trend,
  handicapIndex,
  roundCount,
  compact = false,
  className,
}: HandicapTrendCardProps) {
  return (
    <Card data-slot="handicap-trend-card" className={className}>
      <CardHeader>
        <CardTitle>Handicap Index Trend</CardTitle>
        <CardDescription>{pluralize(roundCount, "round")}</CardDescription>
        <CardAction>
          <Stat align="end">
            <StatLabel>HCP Index</StatLabel>
            <StatValue size={compact ? "md" : "lg"}>{formatHandicapIndex(handicapIndex)}</StatValue>
          </Stat>
        </CardAction>
      </CardHeader>
      <CardContent>
        <SVGScoreHandicapTrend data={trend} series="handicap" compact={compact} />
      </CardContent>
    </Card>
  );
}

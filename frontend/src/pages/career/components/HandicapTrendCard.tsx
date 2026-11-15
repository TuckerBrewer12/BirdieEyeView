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
  trend: RoundTrendPoint[];
  handicapIndex: number | null;
  empty: string;
  compact?: boolean;
  className?: string;
}

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

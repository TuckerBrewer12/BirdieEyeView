import {
  Card,
  CardContent,
  ScoreMixBar,
  ScoreTargetChart,
  Stat,
  StatLabel,
  StatUnit,
  StatValue,
  toParTextClass,
} from "@/brand";
import { formatAverageToPar, formatOneDecimal, formatPercent, pluralize } from "@/domain";
import type { YardageBucket } from "../model";

interface YardageBucketCardProps {
  bucket: YardageBucket;
  className?: string;
}

/** One yardage band: what the golfer averages there, every hole on a target, and how the holes split. */
export function YardageBucketCard({ bucket, className }: YardageBucketCardProps) {
  return (
    <Card data-slot="yardage-bucket-card" size="sm" className={className}>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-2">
          <Stat className="min-w-0">
            <StatValue size="sm" className="text-lg font-bold whitespace-nowrap">
              {bucket.label}
              <StatUnit>yds</StatUnit>
            </StatValue>
            <span className="text-xs text-muted-foreground">{pluralize(bucket.holes, "hole")}</span>
          </Stat>
          <div className="flex shrink-0 gap-4">
            <Stat align="end">
              <StatLabel>Avg</StatLabel>
              <StatValue size="sm">{formatOneDecimal(bucket.averageScore)}</StatValue>
            </Stat>
            <Stat align="end">
              <StatLabel>To Par</StatLabel>
              <StatValue size="sm" className={toParTextClass(bucket.averageToPar)}>
                {formatAverageToPar(bucket.averageToPar)}
              </StatValue>
            </Stat>
          </div>
        </div>

        <ScoreTargetChart
          aria-label={`${bucket.label} yards: every hole by its score`}
          shots={bucket.results.map((result) => ({ toPar: result.toPar, label: `${result.yardage} yds` }))}
        />

        <div className="flex flex-col gap-3 border-t border-border pt-3">
          <div className="flex items-baseline justify-center gap-2 text-sm font-bold">
            <span className="uppercase tracking-eyebrow text-score-birdie">GIR</span>
            <span className="text-card-foreground">{formatPercent(bucket.girPercent)}</span>
          </div>
          {bucket.results.length > 0 && <ScoreMixBar mix={bucket.mix} />}
        </div>
      </CardContent>
    </Card>
  );
}

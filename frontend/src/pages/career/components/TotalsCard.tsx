import { formatCount } from "@/domain/format";
import { Card, CardContent, CardHeader, CardTitle, ScoreKindLabel, Stat, StatLabel, StatValue } from "@/brand";
import { cn } from "@/brand/cn";
import type { CareerTotal } from "../model";
import { TOTAL_LABEL, TOTAL_SCORE_KIND } from "../present";

interface TotalsCardProps {
  title: string;
  totals: CareerTotal[];
  className?: string;
}

/** Counts over the window: rounds, each kind of score (named in its colour), greens and three-putts. */
export function TotalsCard({ title, totals, className }: TotalsCardProps) {
  return (
    <Card data-slot="totals-card" className={cn("@container", className)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-2 @sm:grid-cols-3 @sm:gap-3">
        {totals.map((total) => {
          const kind = TOTAL_SCORE_KIND[total.kind];
          return (
            <Stat key={total.kind} data-kind={kind} className="rounded-xl bg-muted p-3">
              <StatLabel>
                {kind ? <ScoreKindLabel kind={kind}>{TOTAL_LABEL[total.kind]}</ScoreKindLabel> : TOTAL_LABEL[total.kind]}
              </StatLabel>
              <StatValue>{formatCount(total.value)}</StatValue>
            </Stat>
          );
        })}
      </CardContent>
    </Card>
  );
}

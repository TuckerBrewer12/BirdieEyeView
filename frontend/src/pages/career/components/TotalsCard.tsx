import { Card, CardContent, CardHeader, CardTitle, Stat, StatLabel, StatValue } from "@/brand";
import { cn } from "@/brand/cn";
import type { CareerTotal } from "../model";
import { TOTAL_LABEL } from "../present";

interface TotalsCardProps {
  title: string;
  totals: CareerTotal[];
  className?: string;
}

/** Counts over the window: rounds, each kind of score, greens and three-putts. */
export function TotalsCard({ title, totals, className }: TotalsCardProps) {
  return (
    <Card data-slot="totals-card" className={cn("@container", className)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-2 @sm:grid-cols-3 @sm:gap-3">
        {totals.map((total) => (
          <Stat key={total.kind} className="rounded-xl bg-muted p-3">
            <StatLabel>{TOTAL_LABEL[total.kind]}</StatLabel>
            <StatValue>{total.value.toLocaleString("en-US")}</StatValue>
          </Stat>
        ))}
      </CardContent>
    </Card>
  );
}

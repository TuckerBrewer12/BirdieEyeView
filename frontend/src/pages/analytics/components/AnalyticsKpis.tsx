import { Card, CardContent, Stat, StatLabel, StatValue } from "@/brand";
import { cn } from "@/brand/cn";

interface AnalyticsKpi {
  label: string;
  value: string;
  detail?: string | null;
}

interface AnalyticsKpisProps {
  kpis: AnalyticsKpi[];
  className?: string;
}

export function AnalyticsKpis({ kpis, className }: AnalyticsKpisProps) {
  return (
    <div data-slot="analytics-kpis" className={cn("@container", className)}>
      <div className="grid grid-cols-6 gap-3 @2xl:grid-cols-5 @2xl:gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} size="sm" className="col-span-2 nth-[n+4]:col-span-3 @2xl:col-span-1 @2xl:nth-[n+4]:col-span-1">
            <CardContent>
              <Stat align="center">
                <StatLabel>{kpi.label}</StatLabel>
                <StatValue size="lg">{kpi.value}</StatValue>
                {kpi.detail && <div className="max-w-full truncate text-xs text-muted-foreground">{kpi.detail}</div>}
              </Stat>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export type { AnalyticsKpi };

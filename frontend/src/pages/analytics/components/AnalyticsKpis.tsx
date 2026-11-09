import { StatCard } from "@/brand";
import { cn } from "@/brand/cn";
import type { HeadlineFigure } from "../present";

interface AnalyticsKpisProps {
  kpis: HeadlineFigure[];
  className?: string;
}

/**
 * The headline figures over the filtered rounds, one KPI tile each: in one row when there is room,
 * else three over two so no tile sits alone.
 */
export function AnalyticsKpis({ kpis, className }: AnalyticsKpisProps) {
  return (
    <div data-slot="analytics-kpis" className={cn("@container", className)}>
      <div className="grid grid-cols-6 gap-3 @2xl:grid-cols-5 @2xl:gap-4">
        {kpis.map((kpi) => (
          <StatCard
            key={kpi.label}
            className="col-span-2 nth-[n+4]:col-span-3 @2xl:col-span-1 @2xl:nth-[n+4]:col-span-1"
            label={kpi.label}
            value={kpi.value}
            trend={kpi.trend}
            delta={kpi.delta}
            direction={kpi.direction}
            tone={kpi.tone}
            note={kpi.note}
          />
        ))}
      </div>
    </div>
  );
}

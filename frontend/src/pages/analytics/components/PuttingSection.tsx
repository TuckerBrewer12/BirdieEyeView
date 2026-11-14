import { Card, ColumnBars, ShareBar, ShareLegend, StatTile, TrendAreaChart } from "@/brand";
import { cn } from "@/brand/cn";
import { averageLine, formatPercent } from "@/domain";
import type { Analytics, TrendWindow } from "../model";
import {
  formatPutts,
  puttingFigures,
  puttsPerHoleSegments,
  seriesPoints,
  threePuttAverage,
  threePuttColumns,
} from "../present";
import { SectionCard } from "./SectionCard";

export function PuttingSection({ analytics, shown, onShownChange }: { analytics: Analytics } & TrendWindow) {
  const segments = puttsPerHoleSegments(analytics.puttsPerHole);
  return (
    <div data-slot="putting-section" className="flex flex-col gap-4">
      <Card data-slot="putting-figures" className="grid grid-cols-3 gap-0 py-3.5 md:hidden">
        {puttingFigures(analytics).map(({ key, ...figure }, i) => (
          <StatTile {...figure} key={key} layout="center" className={cn(i > 0 && "border-l border-border")} />
        ))}
      </Card>

      <SectionCard title="Putts per round">
        <TrendAreaChart
          shown={shown}
          onShownChange={onShownChange}
          aria-label="Putts each round"
          points={seriesPoints(analytics.puttsTrend, formatPutts)}
          series={[
            { label: "Putts", tone: "neutral", mark: "dots" },
            { label: "5-round avg", tone: "primary" },
          ]}
          reference={averageLine(analytics.kpis.average_putts, formatPutts)}
        />
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-analytics-putting">
        <SectionCard
          title="3-putts per round"
          data-slot="three-putts"
          action={
            <span className="text-body text-foreground-secondary">
              Avg <b className="text-foreground">{threePuttAverage(analytics.kpis.three_putts_per_round)}</b>
            </span>
          }
        >
          <ColumnBars aria-label="Three-putts each round, oldest first" columns={threePuttColumns(analytics.threePutts)} />
        </SectionCard>
        <SectionCard title="Putts per hole" data-slot="putts-per-hole">
          <ShareBar segments={segments} />
          <ShareLegend
            className="md:flex-col md:gap-2"
            items={segments.map((segment) => ({
              key: segment.key,
              tone: segment.tone,
              label: segment.label,
              figure: formatPercent(segment.share),
            }))}
          />
        </SectionCard>
      </div>
    </div>
  );
}

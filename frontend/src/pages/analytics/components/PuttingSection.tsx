import { Card, ColumnBars, ShareBar, ShareLegend, StatDelta, StatLabel, StatValue, TrendAreaChart } from "@/brand";
import { cn } from "@/brand/cn";
import { formatPercent } from "@/domain";
import type { Analytics } from "../model";
import {
  averageLine,
  formatPutts,
  puttingFigures,
  puttsPerHoleSegments,
  seriesPoints,
  threePuttAverage,
  threePuttColumns,
} from "../present";
import { SectionCard } from "./SectionCard";

/** Putting: putts each round, the rounds' three-putts, and how the holes split by putts. */
export function PuttingSection({ analytics }: { analytics: Analytics }) {
  const segments = puttsPerHoleSegments(analytics.puttsPerHole);
  return (
    <div data-slot="putting-section" className="flex flex-col gap-4">
      {/* A phone has no room for the headline's putting figures above, so they lead the section. */}
      <Card data-slot="putting-figures" className="grid grid-cols-3 gap-0 py-3.5 md:hidden">
        {puttingFigures(analytics).map((figure, i) => (
          <PuttingFigure {...figure} key={figure.key} className={cn(i > 0 && "border-l border-border")} />
        ))}
      </Card>

      <SectionCard title="Putts per round">
        <TrendAreaChart
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

function PuttingFigure({
  label,
  value,
  change,
  direction,
  tone,
  className,
}: ReturnType<typeof puttingFigures>[number] & { className?: string }) {
  return (
    <div className={cn("flex flex-col items-center gap-1", className)}>
      <StatValue>{value}</StatValue>
      <StatLabel>{label}</StatLabel>
      {change != null && (
        <StatDelta direction={direction} tone={tone}>
          {change}
        </StatDelta>
      )}
    </div>
  );
}

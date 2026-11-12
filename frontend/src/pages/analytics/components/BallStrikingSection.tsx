import { Meter, ScoreMixBar, ScoreMixLegend, StatValue, TrendAreaChart } from "@/brand";
import { averageLine } from "@/domain";
import type { Analytics } from "../model";
import {
  GIR_SPLIT_LABEL,
  formatGreens,
  holesLabel,
  seriesPoints,
  shortGameBars,
} from "../present";
import { SectionCard } from "./SectionCard";

/** Ball striking: greens hit each round, the short game against the tour's, and how holes go when the green is hit or missed. */
export function BallStrikingSection({ analytics }: { analytics: Analytics }) {
  return (
    <div data-slot="ball-striking-section" className="flex flex-col gap-4">
      <SectionCard title="Greens in regulation">
        <TrendAreaChart
          windowed
          aria-label="Greens hit each round"
          points={seriesPoints(analytics.girTrend, formatGreens)}
          series={[
            { label: "Greens", tone: "neutral", mark: "dots" },
            { label: "5-round avg", tone: "primary" },
          ]}
          format={formatGreens}
          reference={averageLine(analytics.kpis.gir_percentage, formatGreens)}
        />
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-analytics-pair">
        <SectionCard title="Short game" data-slot="short-game" contentClassName="gap-4">
          {shortGameBars(analytics.shortGame).map((bar) => (
            <div key={bar.label} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between">
                <span className="text-body text-foreground-secondary">{bar.label}</span>
                <span className="flex items-baseline gap-1.5">
                  <StatValue>{bar.value}</StatValue>
                  {bar.tour && <span className="text-body-sm text-muted-foreground">tour {bar.tour}</span>}
                </span>
              </div>
              <Meter value={bar.fill} marker={bar.mark} aria-label={`${bar.label}: ${bar.value}`} />
            </div>
          ))}
        </SectionCard>

        <SectionCard title="Hit vs missed green" data-slot="green-split" contentClassName="gap-4">
          {analytics.girSplit.map((split) => (
            <div key={split.bucket} className="flex flex-col gap-1.5">
              <div className="flex justify-between text-body">
                <b className="font-semibold">{GIR_SPLIT_LABEL[split.bucket]}</b>
                <span className="text-muted-foreground">{holesLabel(split.holes)}</span>
              </div>
              <ScoreMixBar mix={split.mix} fold size="lg" legend="none" />
            </div>
          ))}
          <ScoreMixLegend mixes={analytics.girSplit.map((split) => split.mix)} fold />
        </SectionCard>
      </div>
    </div>
  );
}

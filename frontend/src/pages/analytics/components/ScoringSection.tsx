import { ColumnBars, LinePicker, Meter, ToggleGroup, ToggleGroupItem, TrendAreaChart } from "@/brand";
import { averageLine } from "@/domain";
import type { Analytics, TrendLine, TrendWindow } from "../model";
import {
  TREND_LINES_LABEL,
  TREND_LINES_OFF,
  benchmarkNote,
  countLines,
  difficultyColumns,
  formatScore,
  parTypeBars,
  scoreShown,
  seriesPoints,
  trendLineOptions,
} from "../present";
import type { ScoreReading } from "../useAnalyticsPageViewModel";
import { ParTypeRow } from "./ParTypeRow";
import { SectionCard } from "./SectionCard";

interface ScoringSectionProps extends TrendWindow {
  analytics: Analytics;
  reading: ScoreReading;
  onReadingChange: (reading: ScoreReading) => void;
  lines: TrendLine[];
  onLinesChange: (lines: TrendLine[]) => void;
}

const READINGS: { value: ScoreReading; label: string }[] = [
  { value: "gross", label: "Gross" },
  { value: "net", label: "Net" },
];

export function ScoringSection({ analytics, reading, onReadingChange, lines, onLinesChange, shown, onShownChange }: ScoringSectionProps) {
  const series = reading === "net" ? analytics.netTrend : analytics.scoreTrend;
  const note = benchmarkNote(analytics.benchmarkHandicap);
  return (
    <div data-slot="scoring-section" className="flex flex-col gap-4">
      <SectionCard
        title="Score trend"
        action={
          <ToggleGroup
            size="sm"
            aria-label="Score type"
            value={[reading]}
            onValueChange={(values: string[]) => {
              const next = READINGS.find((option) => option.value === values[0]);
              if (next) onReadingChange(next.value);
            }}
          >
            {READINGS.map((option) => (
              <ToggleGroupItem key={option.value} value={option.value}>
                {option.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        }
      >
        <TrendAreaChart
          shown={shown}
          onShownChange={onShownChange}
          aria-label={reading === "net" ? "Net score each round" : "Score each round"}
          points={seriesPoints(series, formatScore)}
          series={[
            { label: reading === "net" ? "Net" : "Score", tone: "neutral", mark: "dots" },
            { label: "5-round avg", tone: "primary" },
          ]}
          reference={reading === "gross" ? averageLine(analytics.kpis.scoring_average, formatScore) : null}
          counts={countLines(series, lines)}
          showSeries={scoreShown(lines)}
          offLabel={TREND_LINES_OFF}
        />
        <LinePicker
          label={TREND_LINES_LABEL}
          options={trendLineOptions(series)}
          value={lines}
          onChange={onLinesChange}
          className="border-t border-border pt-3.5"
        />
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-analytics-pair">
        <SectionCard title="By hole par" description={note} data-slot="by-hole-par">
          {parTypeBars(analytics.parTypes).map((bar) => (
            <ParTypeRow key={bar.par} label={bar.label} value={bar.value}>
              <Meter
                value={bar.fill}
                marker={bar.mark}
                tone={bar.tone}
                aria-label={`${bar.label}: ${bar.value} a hole`}
              />
            </ParTypeRow>
          ))}
        </SectionCard>
        <SectionCard
          title="By hole difficulty"
          description="Hardest to easiest by handicap · worst three in red"
          data-slot="by-hole-difficulty"
        >
          <ColumnBars
            aria-label="Average to par by hole handicap, 1 the hardest"
            columns={difficultyColumns(analytics.holeDifficulty)}
          />
        </SectionCard>
      </div>
    </div>
  );
}

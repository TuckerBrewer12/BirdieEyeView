import { Card, EmptyNote, ScoreMixBar, ScoreMixLegend, StatLabel, StatValue, ToggleGroup, ToggleGroupItem } from "@/brand";
import { APPROACH_PARS, type Analytics, type ApproachPar } from "../model";
import { APPROACH_EMPTY, bucketCards, parLabel } from "../present";

interface ApproachSectionProps {
  analytics: Analytics;
  par: ApproachPar;
  onParChange: (par: ApproachPar) => void;
}

export function ApproachSection({ analytics, par, onParChange }: ApproachSectionProps) {
  const cards = bucketCards(analytics.yardageBuckets, par);
  return (
    <div data-slot="approach-section" className="flex flex-col gap-3.5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <span className="hidden text-body-lg font-semibold md:inline">By hole length</span>
        <ToggleGroup
          aria-label="Hole par"
          fill
          value={[String(par)]}
          onValueChange={(values: string[]) => {
            const next = APPROACH_PARS.find((option) => String(option) === values[0]);
            if (next) onParChange(next);
          }}
          className="md:w-fit"
        >
          {APPROACH_PARS.map((option) => (
            <ToggleGroupItem key={option} value={String(option)}>
              {parLabel(option)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {cards.length === 0 ? (
        <Card size="lg">
          <EmptyNote className="py-0">{APPROACH_EMPTY}</EmptyNote>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3.5 md:grid-cols-3 md:gap-4">
          {cards.map((card) => (
            <Card key={card.key} size="lg" data-slot="yardage-band" className="gap-3.5 px-(--card-spacing)">
              <div className="flex items-baseline justify-between">
                <span className="text-subhead font-bold">
                  {card.range} <span className="text-body font-medium text-muted-foreground">yds</span>
                </span>
                <span className="text-body-sm text-muted-foreground">{card.holes}</span>
              </div>
              <div className="flex items-baseline gap-5">
                <div className="flex flex-col gap-1.5">
                  <StatValue size="card-sm" tone={card.tone}>
                    {card.toPar}
                  </StatValue>
                  <StatLabel>Avg to par</StatLabel>
                </div>
                <div className="flex flex-col gap-1.5">
                  <StatValue>{card.greens}</StatValue>
                  <StatLabel>Greens hit</StatLabel>
                </div>
              </div>
              <ScoreMixBar mix={card.mix} fold size="lg" legend="none" />
            </Card>
          ))}
        </div>
      )}
      {cards.length > 0 && <ScoreMixLegend mixes={cards.map((card) => card.mix)} fold />}
    </div>
  );
}

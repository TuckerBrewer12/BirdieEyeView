import { Card, CardTitle, StatValue } from "@/brand";
import { cn } from "@/brand/cn";
import { formatOneDecimal } from "@/domain";
import type { PeakGame, PeakImpact } from "../profileModel";
import { peakNote, peakRoundCourse, peakRow } from "../profilePresent";

interface PeakCardProps {
  peak: PeakGame;
  impacts: PeakImpact[];
  target: number;
}

/** The golfer's best rounds: their average against the goal, the rounds, and what they did more or less of a round. */
export function PeakCard({ peak, impacts, target }: PeakCardProps) {
  const note = peakNote(peak, target);
  return (
    <Card size="lg" data-slot="peak-card" className="grid grid-cols-1 gap-5 px-(--card-spacing) md:grid-cols-analytics-goal md:gap-7">
      <div className="flex flex-col gap-2.5">
        <CardTitle level={2} className="text-body-lg font-semibold">
          Peak game
        </CardTitle>
        <div className="flex items-baseline gap-2.5">
          <StatValue size="card">{formatOneDecimal(peak.average)}</StatValue>
          <span className="text-body text-foreground-secondary">
            {note.lead}
            {note.verdict && (
              <>
                {" · "}
                <b className={cn(note.met ? "text-primary" : "text-score-bogey")}>{note.verdict}</b>
              </>
            )}
          </span>
        </div>
        <div className="hidden flex-col md:flex">
          {peak.rounds.map((round, i) => (
            <div key={round.roundId ?? i} className="flex justify-between border-t border-border py-2 text-body-lg">
              <span className="text-foreground-secondary">{peakRoundCourse(round, i)}</span>
              <b>{round.score}</b>
            </div>
          ))}
        </div>
      </div>
      {impacts.length > 0 && (
        <div data-slot="peak-table" className="flex flex-col">
          <div className="hidden grid-cols-peak-table gap-2 pb-2 text-body-sm font-semibold text-muted-foreground md:grid">
            <span>Per round</span>
            <span className="text-right">Peak</span>
            <span className="text-right">Average</span>
            <span className="text-right">Gained</span>
          </div>
          {impacts.map((impact) => {
            const row = peakRow(impact);
            return (
              <div key={impact.kind} className="grid grid-cols-peak-table items-center gap-2 border-t border-border py-2.5 text-body-lg">
                <span>{row.label}</span>
                <b className="text-right">{row.peak}</b>
                <span className="text-right text-muted-foreground">{row.average}</span>
                <b className="text-right text-primary">{row.gained}</b>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

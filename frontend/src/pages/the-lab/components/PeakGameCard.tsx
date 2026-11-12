import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Meter,
  Stat,
  StatLabel,
  StatUnit,
  StatValue,
  ToParFigure,
} from "@/brand";
import { formatCourseName, formatOneDecimal, pluralize } from "@/domain";
import type { PeakGame, PeakImpact } from "../model";
import { PEAK_IMPACT_LABEL, peakGapNote, signedStrokes } from "../present";

interface PeakGameCardProps {
  peak: PeakGame;
  /** Birdies, bogeys and doubles a round in the best rounds against every round. Empty with no score types. */
  impacts: PeakImpact[];
  /** The goal as the golfer picked it: "Break 80". */
  goalLabel: string | null;
  className?: string;
}

/** The golfer's best three rounds: their average, how close it is to the goal, and what they did differently. */
export function PeakGameCard({ peak, impacts, goalLabel, className }: PeakGameCardProps) {
  return (
    <Card data-slot="peak-game-card" className={className}>
      <CardHeader>
        <CardTitle>Your Peak Game</CardTitle>
        <CardDescription>{goalLabel && peakGapNote(peak, goalLabel)}</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <div className="flex items-end gap-6">
            <Stat>
              <StatLabel>Best {pluralize(peak.rounds.length, "round")}</StatLabel>
              <StatValue size="lg">
                {formatOneDecimal(peak.average)}
                <StatUnit>avg</StatUnit>
              </StatValue>
            </Stat>
            {peak.overallAverage != null && (
              <Stat>
                <StatLabel>Overall</StatLabel>
                <StatValue className="text-muted-foreground">{formatOneDecimal(peak.overallAverage)}</StatValue>
              </Stat>
            )}
          </div>
          <ul className="flex flex-col divide-y divide-border">
            {peak.rounds.map((round, i) => (
              <li key={round.roundId ?? i} className="flex items-center justify-between gap-3 py-1.5 text-sm">
                <span className="truncate text-muted-foreground">
                  {round.courseName ? formatCourseName(round.courseName) : `Round ${i + 1}`}
                </span>
                <span className="font-mono font-bold text-card-foreground">{round.score}</span>
              </li>
            ))}
          </ul>
        </div>

        {impacts.length > 0 && (
          <div className="flex flex-col gap-3">
            <span className="text-eyebrow uppercase text-muted-foreground">
              Peak vs. average, a round
            </span>
            {impacts.map((impact) => {
              const scale = Math.max(impact.peak, impact.average, 0.1) * 1.2;
              const signed = signedStrokes(impact.strokes);
              return (
                <div key={impact.kind} className="flex flex-col gap-1.5">
                  <div className="flex items-baseline justify-between text-label">
                    <span className="font-semibold text-card-foreground">{PEAK_IMPACT_LABEL[impact.kind]}</span>
                    <ToParFigure
                      toPar={signed.toPar}
                      size="inherit"
                      label={`${signed.text} ${impact.strokes >= 0 ? "gained" : "lost"}`}
                      className="font-bold"
                    />
                  </div>
                  <Meter
                    value={(impact.peak / scale) * 100}
                    marker={(impact.average / scale) * 100}
                    aria-label={`${PEAK_IMPACT_LABEL[impact.kind]}: ${formatOneDecimal(impact.peak)} a round at your peak, ${formatOneDecimal(impact.average)} on average`}
                  />
                  <div className="flex justify-between text-caption text-muted-foreground">
                    <span>Peak {formatOneDecimal(impact.peak)}</span>
                    <span>Avg {formatOneDecimal(impact.average)} (tick)</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

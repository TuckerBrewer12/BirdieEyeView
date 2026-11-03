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
} from "@/brand";
import { cn } from "@/brand/cn";
import { formatCourseName, formatOneDecimal, pluralize } from "@/domain";
import type { PeakGame, PeakImpact } from "../model";
import { PEAK_IMPACT_LABEL, peakGapNote, signedStrokes } from "../present";

interface PeakGameCardProps {
  peak: PeakGame;
  impacts: PeakImpact[];
  goalLabel: string | null;
  className?: string;
}

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
            <span className="text-meta font-bold uppercase tracking-eyebrow text-muted-foreground">
              Peak vs. average, a round
            </span>
            {impacts.map((impact) => {
              const scale = Math.max(impact.peak, impact.average, 0.1) * 1.2;
              const signed = signedStrokes(impact.strokes);
              return (
                <div key={impact.kind} className="flex flex-col gap-1.5">
                  <div className="flex items-baseline justify-between text-label">
                    <span className="font-semibold text-card-foreground">{PEAK_IMPACT_LABEL[impact.kind]}</span>
                    <span className={cn("font-bold", signed.tone)}>
                      {signed.text} {impact.strokes >= 0 ? "gained" : "lost"}
                    </span>
                  </div>
                  <Meter
                    value={(impact.peak / scale) * 100}
                    marker={(impact.average / scale) * 100}
                    aria-label={`${PEAK_IMPACT_LABEL[impact.kind]}: ${impact.peak.toFixed(1)} a round at your peak, ${impact.average.toFixed(1)} on average`}
                  />
                  <div className="flex justify-between text-caption text-muted-foreground">
                    <span>Peak {impact.peak.toFixed(1)}</span>
                    <span>Avg {impact.average.toFixed(1)} (tick)</span>
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

import { HoleScoreBars, StatValue, ToParPill } from "@/brand";
import { cn } from "@/brand/cn";
import type { SampleRound } from "../sampleRound";

interface SampleRoundCardProps {
  round: SampleRound;
  className?: string;
}

/**
 * The round a scan reads back, floated over the hero's photo of a card: the course, the tees and
 * putts, the score with its to-par, and a cell a hole in its score's colour. Decoration: the
 * headline beside it says what the app does.
 */
export function SampleRoundCard({ round, className }: SampleRoundCardProps) {
  return (
    <div
      aria-hidden
      data-slot="sample-round-card"
      className={cn("flex flex-col gap-2.5 rounded-card bg-card p-3.5 shadow-lg md:p-4", className)}
    >
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{round.course}</p>
          <p className="hidden text-body-sm text-muted-foreground md:block">{round.detail}</p>
        </div>
        <div className="flex items-baseline gap-1.5">
          <StatValue size="md">{round.score}</StatValue>
          <ToParPill toPar={round.toPar} ground="muted" />
        </div>
      </div>
      <HoleScoreBars holes={round.holes} variant="strip" className="w-full" />
    </div>
  );
}

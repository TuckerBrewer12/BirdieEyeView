import { cn } from "@/brand/cn";
import { scoreFillClass } from "@/brand/theme";
import type { ScoreMix } from "@/domain/score";
import { scoreMixEntries } from "./scoreMixEntries";

interface ScoreMixBarProps {
  /** Each kind's share of the holes, or with `counted`, the server's count of holes of each kind. */
  mix: ScoreMix;
  /** The mix is hole counts (a round's `scoreCounts`): the legend reads "10 pars" rather than "52% par". */
  counted?: boolean;
  className?: string;
}

/** How a player's holes split across score kinds: one stacked bar, then each kind's figure beside it. */
export function ScoreMixBar({ mix, counted = false, className }: ScoreMixBarProps) {
  const entries = scoreMixEntries(mix, counted);
  if (entries.length === 0) return null;

  return (
    <div data-slot="score-mix-bar" className={cn("flex flex-col gap-2", className)}>
      <div
        role="img"
        aria-label={`Score mix: ${entries.map((entry) => `${entry.figure} ${entry.word}`).join(", ")}`}
        className="flex h-2 gap-0.5 overflow-hidden rounded-sm"
      >
        {entries.map(({ kind }) => (
          <div key={kind} className={cn("min-w-0.5 basis-0", scoreFillClass(kind))} style={{ flexGrow: mix[kind] }} />
        ))}
      </div>
      <div aria-hidden className="flex flex-wrap gap-x-3 gap-y-1 text-body text-foreground-secondary">
        {entries.map((entry) => (
          <span key={entry.kind}>
            <b className="font-bold text-foreground">{entry.figure}</b> {entry.word}
          </span>
        ))}
      </div>
    </div>
  );
}

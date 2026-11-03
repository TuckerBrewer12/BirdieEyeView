import { cn } from "@/brand/cn";
import { SCORE_KEYS, scoreFillClass, scoreKindLabel } from "@/brand/theme";
import { formatPercent } from "@/domain/format";
import { scoreKindCountLabel, type ScoreMix } from "@/domain/score";

interface ScoreMixBarProps {
  /** Each kind's share of the holes, or with `counted`, the server's count of holes of each kind. */
  mix: ScoreMix;
  /** The mix is hole counts (a round's `scoreCounts`): the legend reads "10 pars" rather than "52% par". */
  counted?: boolean;
  className?: string;
}

/** How a player's holes split across score kinds: one stacked bar, then each kind's figure beside it. */
export function ScoreMixBar({ mix, counted = false, className }: ScoreMixBarProps) {
  // Slivers under half a percent would only draw as a seam, so the bar and legend both skip them.
  const shown = SCORE_KEYS.filter((kind) => mix[kind] > 0.5);
  const entries = shown.map((kind) =>
    counted
      ? { kind, figure: String(mix[kind]), word: scoreKindCountLabel(kind, mix[kind]).toLowerCase() }
      : { kind, figure: formatPercent(mix[kind]), word: scoreKindLabel(kind).toLowerCase() },
  );

  return (
    <div data-slot="score-mix-bar" className={cn("flex flex-col gap-2.5", className)}>
      <div
        role="img"
        aria-label={`Score mix: ${entries.map((entry) => `${entry.figure} ${entry.word}`).join(", ")}`}
        className="flex h-2 gap-0.5 overflow-hidden rounded-sm"
      >
        {shown.map((kind) => (
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

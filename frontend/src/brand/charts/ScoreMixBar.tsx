import { cn } from "@/brand/cn";
import { SCORE_KEYS, scoreFillClass, scoreKindLabel, type ScoreKey } from "@/brand/theme";
import { formatPercent } from "@/domain/format";
import { scoreKindCountLabel, type ScoreMix } from "@/domain/score";

interface ScoreMixBarProps {
  mix: ScoreMix;
  /** How many holes the shares cover. With it the legend counts holes ("10 pars"); without, it gives each share. */
  holes?: number;
  className?: string;
}

/** Par is the long grey run of the bar, so on a white card it takes the stronger border grey to stay seen. */
function fillClass(kind: ScoreKey): string {
  return kind === "par" ? "bg-border-strong" : scoreFillClass(kind);
}

/** How a player's holes split across score kinds: one stacked bar, then the count of each kind beside it. */
export function ScoreMixBar({ mix, holes, className }: ScoreMixBarProps) {
  // Slivers under half a percent would only draw as a seam, so the bar and legend both skip them.
  const shown = SCORE_KEYS.filter((kind) => mix[kind] > 0.5);

  const entries = shown.map((kind) => {
    if (holes == null) return { kind, figure: formatPercent(mix[kind]), word: scoreKindLabel(kind).toLowerCase() };
    const count = Math.round((mix[kind] * holes) / 100);
    return { kind, figure: String(count), word: scoreKindCountLabel(kind, count).toLowerCase() };
  });

  return (
    <div data-slot="score-mix-bar" className={cn("flex flex-col gap-2.5", className)}>
      <div
        role="img"
        aria-label={`Score mix: ${entries.map((entry) => `${entry.figure} ${entry.word}`).join(", ")}`}
        className="flex h-2 gap-0.5 overflow-hidden rounded-sm"
      >
        {shown.map((kind) => (
          <div key={kind} className={cn("min-w-0.5 basis-0", fillClass(kind))} style={{ flexGrow: mix[kind] }} />
        ))}
      </div>
      <div aria-hidden className="flex flex-wrap gap-x-3.5 gap-y-1 text-body text-foreground-secondary">
        {entries.map((entry) => (
          <span key={entry.kind}>
            <b className="font-bold text-foreground">{entry.figure}</b> {entry.word}
          </span>
        ))}
      </div>
    </div>
  );
}

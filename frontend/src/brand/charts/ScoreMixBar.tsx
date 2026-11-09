import { cn } from "@/brand/cn";
import { SCORE_KEYS, scoreFillClass, scoreKindLabel } from "@/brand/theme";
import { formatPercent } from "@/domain/format";
import { scoreKindCountLabel, type ScoreMix } from "@/domain/score";

interface ScoreMixBarProps {
  /** Each kind's share of the holes, or with `counted`, the server's count of holes of each kind. */
  mix: ScoreMix;
  /** The mix is hole counts (a round's `scoreCounts`): the legend reads "10 pars" rather than "52% par". */
  counted?: boolean;
  /**
   * `key` sets each kind as a swatch, its name and its share ("Birdie 10%") on a pill-ended bar,
   * the dashboard's; `lg` draws that bar taller, for a wide card.
   */
  legend?: "figures" | "key";
  size?: "default" | "lg";
  className?: string;
}

/** How a player's holes split across score kinds: one stacked bar, then each kind's figure beside it. */
export function ScoreMixBar({ mix, counted = false, legend = "figures", size = "default", className }: ScoreMixBarProps) {
  // Slivers under half a percent would only draw as a seam, so the bar and legend both skip them.
  const shown = SCORE_KEYS.filter((kind) => mix[kind] > 0.5);
  if (shown.length === 0) return null;
  const entries = shown.map((kind) =>
    counted
      ? { kind, figure: String(mix[kind]), word: scoreKindCountLabel(kind, mix[kind]).toLowerCase() }
      : { kind, figure: formatPercent(mix[kind]), word: scoreKindLabel(kind).toLowerCase() },
  );
  const keyed = legend === "key";

  return (
    <div data-slot="score-mix-bar" className={cn("flex flex-col gap-2", className)}>
      <div
        role="img"
        aria-label={`Score mix: ${entries.map((entry) => `${entry.figure} ${entry.word}`).join(", ")}`}
        className={cn(
          "flex gap-0.5 overflow-hidden",
          size === "lg" ? "h-2.5" : "h-2",
          keyed ? "rounded-full" : "rounded-sm",
        )}
      >
        {shown.map((kind) => (
          <div key={kind} className={cn("min-w-0.5 basis-0", scoreFillClass(kind))} style={{ flexGrow: mix[kind] }} />
        ))}
      </div>
      {keyed ? (
        <div
          aria-hidden
          className={cn(
            "flex flex-wrap gap-y-1.5 text-body-sm text-foreground-secondary",
            size === "lg" ? "gap-x-4" : "gap-x-3",
          )}
        >
          {shown.map((kind) => (
            <span key={kind} className="flex items-center gap-1.5">
              <span className={cn("size-2 rounded-tick", scoreFillClass(kind))} />
              {scoreKindLabel(kind)} <b className="font-semibold text-foreground">{formatPercent(mix[kind])}</b>
            </span>
          ))}
        </div>
      ) : (
        <div aria-hidden className="flex flex-wrap gap-x-3 gap-y-1 text-body text-foreground-secondary">
          {entries.map((entry) => (
            <span key={entry.kind}>
              <b className="font-bold text-foreground">{entry.figure}</b> {entry.word}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

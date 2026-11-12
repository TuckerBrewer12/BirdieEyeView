import { cn } from "@/brand/cn";
import type { ScoreMix } from "@/domain/score";
import { scoreMixEntries, scoreMixKinds } from "./scoreMixEntries";
import { ShareBar, ShareLegend } from "./ShareBar";

interface ScoreMixBarProps {
  /** Each kind's share of the holes, or with `counted`, the server's count of holes of each kind. */
  mix: ScoreMix;
  /** The mix is hole counts (a round's `scoreCounts`): the legend reads "10 pars" rather than "52% par". */
  counted?: boolean;
  /** Triples and worse as one segment, "Triple+". */
  fold?: boolean;
  /** `sm` is the thin bar; `lg` prints each share inside it. */
  size?: "sm" | "lg";
  /**
   * `figures`: each kind's figure and word after the bar ("**40%** par"). `key`: a swatch, the kind
   * and its figure. `none`: the bar alone, for a stack of bars under one {@link ScoreMixLegend}.
   */
  legend?: "figures" | "key" | "none";
  /** From `md`, the bar and its legend sit on one line. */
  inline?: boolean;
  className?: string;
}

/** How a player's holes split across score kinds: one {@link ShareBar}, then each kind's figure. */
export function ScoreMixBar({
  mix,
  counted = false,
  fold = false,
  size = "sm",
  legend = "figures",
  inline = false,
  className,
}: ScoreMixBarProps) {
  const entries = scoreMixEntries(mix, { counted, fold });
  if (entries.length === 0) return null;

  return (
    <div
      data-slot="score-mix-bar"
      className={cn("flex flex-col gap-2", inline && "md:flex-row md:items-center md:gap-4", className)}
    >
      <ShareBar
        size={size}
        aria-label={`Score mix: ${entries.map((entry) => `${entry.figure} ${entry.word}`).join(", ")}`}
        segments={entries.map((entry) => ({ key: entry.kind, share: entry.value, tone: entry.kind, label: entry.label }))}
        className={cn(inline && "md:flex-1")}
      />
      {legend === "figures" && (
        <div aria-hidden className="flex flex-wrap gap-x-3 gap-y-1 text-body text-foreground-secondary">
          {entries.map((entry) => (
            <span key={entry.kind}>
              <b className="font-bold text-foreground">{entry.figure}</b> {entry.word}
            </span>
          ))}
        </div>
      )}
      {legend === "key" && (
        <ShareLegend items={entries.map((entry) => ({ key: entry.kind, tone: entry.kind, label: entry.label, figure: entry.figure }))} />
      )}
    </div>
  );
}

/** The key under a stack of score-mix bars: the kinds any of them show. */
export function ScoreMixLegend({ mixes, fold = false, className }: { mixes: readonly ScoreMix[]; fold?: boolean; className?: string }) {
  return (
    <ShareLegend
      items={scoreMixKinds(mixes, fold).map((entry) => ({ key: entry.kind, tone: entry.kind, label: entry.label }))}
      className={className}
    />
  );
}

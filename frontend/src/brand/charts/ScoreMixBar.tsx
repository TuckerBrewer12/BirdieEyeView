import { cn } from "@/brand/cn";
import { SCORE_KEYS, scoreFillClass, scoreKindLabel } from "@/brand/theme";
import type { ScoreMix } from "@/domain";

interface ScoreMixBarProps {
  mix: ScoreMix;
  className?: string;
}

/** How a player's holes split across score kinds: one stacked bar, then each kind's share under it. */
export function ScoreMixBar({ mix, className }: ScoreMixBarProps) {
  // Slivers under half a percent would only draw as a seam, so the bar and legend both skip them.
  const shown = SCORE_KEYS.filter((kind) => mix[kind] > 0.5);
  const pct = (kind: (typeof shown)[number]) => `${mix[kind].toFixed(0)}%`;

  return (
    <div data-slot="score-mix-bar" className={cn("flex flex-col gap-2", className)}>
      <div
        role="img"
        aria-label={`Score mix: ${shown.map((kind) => `${pct(kind)} ${scoreKindLabel(kind)}`).join(", ")}`}
        className="flex h-2 gap-0.5 overflow-hidden rounded-sm"
      >
        {shown.map((kind) => (
          <div
            key={kind}
            className={cn("min-w-0.5 basis-0", scoreFillClass(kind))}
            style={{ flexGrow: mix[kind] }}
          />
        ))}
      </div>
      <div className="flex justify-between">
        {shown.map((kind) => (
          <div key={kind} className="flex flex-col items-center gap-0.5">
            <span className="text-xs font-semibold tabular-nums text-foreground">{pct(kind)}</span>
            <span className="flex items-center gap-1">
              <span className={cn("size-1.5 shrink-0 rounded-xs", scoreFillClass(kind))} />
              <span className="text-caption font-semibold uppercase tracking-chip text-muted-foreground">
                {scoreKindLabel(kind)}
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

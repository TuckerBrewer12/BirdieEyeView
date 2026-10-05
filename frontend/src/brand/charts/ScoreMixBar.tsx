import { cn } from "@/brand/cn";
import { SCORE_KEYS, scoreFillClass, type ScoreKey } from "@/brand/theme";
import type { ScoreMix } from "@/domain";

/** Five legend buckets: the rare ends fold into their neighbours so the row stays readable. */
const LEGEND: { label: string; kinds: ScoreKey[]; swatch: ScoreKey }[] = [
  { label: "Birdie+", kinds: ["eagle", "birdie"], swatch: "birdie" },
  { label: "Par", kinds: ["par"], swatch: "par" },
  { label: "Bogey", kinds: ["bogey"], swatch: "bogey" },
  { label: "Dbl", kinds: ["double"], swatch: "double" },
  { label: "Tpl+", kinds: ["triple", "quad"], swatch: "triple" },
];

interface ScoreMixBarProps {
  mix: ScoreMix;
  className?: string;
}

/** How a player's holes split across score kinds: one stacked bar, then the share of each bucket. */
export function ScoreMixBar({ mix, className }: ScoreMixBarProps) {
  const buckets = LEGEND.map((item) => ({
    ...item,
    pct: `${item.kinds.reduce((sum, kind) => sum + mix[kind], 0).toFixed(0)}%`,
  }));

  return (
    <div data-slot="score-mix-bar" className={cn("flex flex-col gap-2", className)}>
      <div
        role="img"
        aria-label={`Score mix: ${buckets.map((b) => `${b.pct} ${b.label}`).join(", ")}`}
        className="flex h-2 gap-0.5 overflow-hidden rounded-sm"
      >
        {/* Slivers under half a percent would only draw as a seam. */}
        {SCORE_KEYS.filter((kind) => mix[kind] > 0.5).map((kind) => (
          <div
            key={kind}
            className={cn("min-w-0.5 basis-0", scoreFillClass(kind))}
            style={{ flexGrow: mix[kind] }}
          />
        ))}
      </div>
      <div className="grid grid-cols-5">
        {buckets.map((b) => (
          <div key={b.label} className="flex flex-col items-center gap-0.5">
            <span className="text-xs font-semibold tabular-nums text-foreground">{b.pct}</span>
            <span className="flex items-center gap-1">
              <span className={cn("size-1.5 shrink-0 rounded-xs", scoreFillClass(b.swatch))} />
              <span className="text-caption font-semibold uppercase tracking-chip text-muted-foreground">
                {b.label}
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

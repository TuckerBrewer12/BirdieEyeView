import { cn } from "@/brand/cn";
import type { ScoreMix } from "@/domain/score";
import { scoreMixEntries, scoreMixKinds } from "./scoreMixEntries";
import { ShareBar, ShareLegend } from "./ShareBar";

interface ScoreMixBarProps {
  mix: ScoreMix;
  counted?: boolean;
  fold?: boolean;
  size?: "sm" | "lg";
  legend?: "figures" | "none";
  className?: string;
}

export function ScoreMixBar({
  mix,
  counted = false,
  fold = false,
  size = "sm",
  legend = "figures",
  className,
}: ScoreMixBarProps) {
  const entries = scoreMixEntries(mix, { counted, fold });
  if (entries.length === 0) return null;

  return (
    <div
      data-slot="score-mix-bar"
      className={cn("flex flex-col gap-2", className)}
    >
      <ShareBar
        size={size}
        aria-label={`Score mix: ${entries.map((entry) => `${entry.figure} ${entry.word}`).join(", ")}`}
        segments={entries.map((entry) => ({ key: entry.kind, share: entry.value, tone: entry.kind, label: entry.label }))}
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
    </div>
  );
}

export function ScoreMixLegend({ mixes, fold = false, className }: { mixes: readonly ScoreMix[]; fold?: boolean; className?: string }) {
  return (
    <ShareLegend
      items={scoreMixKinds(mixes, fold).map((entry) => ({ key: entry.kind, tone: entry.kind, label: entry.label }))}
      className={className}
    />
  );
}

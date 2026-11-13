import { cn } from "@/brand/cn";
import { scoreFillClass, scoreOnFillClass, type ScoreKey } from "@/brand/theme";
import { formatPercent } from "@/domain/format";

// A share narrower than this would crowd its figure, so its segment draws without one.
const LABEL_SHARE = 8;

interface ShareSegment {
  key: string;
  /** Its part of the whole: a percent, or any measure the segments share, such as a count of holes. */
  share: number;
  /** The score colour it is painted in: a one-putt reads as a birdie, a three-putt as a bogey. */
  tone: ScoreKey;
  /** What the share is of, for screen readers and the legend: "Par", "2 putts". */
  label: string;
}

interface ShareBarProps {
  segments: ShareSegment[];
  /** `sm` is a thin bar; `lg` is tall enough to print each share inside it. */
  size?: "sm" | "lg";
  /** What the bar says to a screen reader, when the shares aren't percents: "Score mix: 10 pars, …". */
  "aria-label"?: string;
  className?: string;
}

/**
 * A whole split into shares, one coloured segment each in order, a hairline apart: the holes by
 * score, the putts on a hole. The tall bar prints each share inside its segment where it fits.
 * Shares of none are left out, so a seam never stands for nothing.
 */
function ShareBar({ segments, size = "lg", "aria-label": ariaLabel, className }: ShareBarProps) {
  const shown = segments.filter((segment) => segment.share > 0);
  if (shown.length === 0) return null;
  return (
    <div
      data-slot="share-bar"
      role="img"
      aria-label={ariaLabel ?? shown.map((segment) => `${segment.label} ${formatPercent(segment.share)}`).join(", ")}
      className={cn(
        "flex gap-0.5 overflow-hidden",
        size === "lg" ? "h-6 rounded-md" : "h-2 rounded-sm",
        className,
      )}
    >
      {shown.map((segment) => (
        <div
          key={segment.key}
          className={cn(
            "flex min-w-0.5 basis-0 items-center justify-center overflow-hidden text-label font-bold",
            scoreFillClass(segment.tone),
            scoreOnFillClass(segment.tone),
          )}
          style={{ flexGrow: segment.share }}
        >
          {size === "lg" && segment.share >= LABEL_SHARE && formatPercent(segment.share)}
        </div>
      ))}
    </div>
  );
}

interface ShareLegendItem {
  key: string;
  tone: ScoreKey;
  label: string;
  /** A figure after the label, bold: "42%". */
  figure?: string;
}

/** The key under one or more share bars: a swatch and a name for each colour, and its figure when given. */
function ShareLegend({ items, className }: { items: ShareLegendItem[]; className?: string }) {
  return (
    <div
      data-slot="share-legend"
      aria-hidden
      className={cn("flex flex-wrap gap-x-3 gap-y-1.5 text-body-sm text-foreground-secondary", className)}
    >
      {items.map((item) => (
        <span key={item.key} className="flex items-center gap-1">
          <span className={cn("size-2 rounded-xs", scoreFillClass(item.tone))} />
          {item.label}
          {item.figure && <b className="font-bold text-foreground">{item.figure}</b>}
        </span>
      ))}
    </div>
  );
}

export { ShareBar, ShareLegend };
export type { ShareBarProps, ShareSegment, ShareLegendItem };

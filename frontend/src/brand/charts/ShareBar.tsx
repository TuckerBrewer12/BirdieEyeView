import { cn } from "@/brand/cn";
import { scoreFillClass, scoreOnFillClass, type ScoreKey } from "@/brand/theme";
import { formatPercent } from "@/domain/format";
import { ScoreKindLabel } from "@/brand/components/ScoreKindLabel";

const LABEL_SHARE = 8;

interface ShareSegment {
  key: string;
  share: number;
  tone: ScoreKey;
  label: string;
}

interface ShareBarProps {
  segments: ShareSegment[];
  size?: "sm" | "lg";
  "aria-label"?: string;
  className?: string;
}

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
  figure?: string;
}

function ShareLegend({ items, className }: { items: ShareLegendItem[]; className?: string }) {
  return (
    <div
      data-slot="share-legend"
      aria-hidden
      className={cn("flex flex-wrap gap-x-3 gap-y-1.5 text-body-sm text-foreground-secondary", className)}
    >
      {items.map((item) => (
        <ScoreKindLabel key={item.key} kind={item.tone} swatch="fill" ink="inherit" className="gap-1">
          {item.label}
          {item.figure && <b className="font-bold text-foreground">{item.figure}</b>}
        </ScoreKindLabel>
      ))}
    </div>
  );
}

export { ShareBar, ShareLegend };
export type { ShareBarProps, ShareSegment, ShareLegendItem };

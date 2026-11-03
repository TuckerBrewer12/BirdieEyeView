import { cn } from "@/brand/cn";
import { Button } from "./Button";

interface ScanNeedsReviewProps {
  /** The holes the scan was unsure about, by number. */
  holes: readonly number[];
  onReview: () => void;
  className?: string;
}

/** `4`, `4 and 11`, `4, 11 and 16`. */
function listHoles(holes: readonly number[]): string {
  if (holes.length < 2) return holes.join("");
  return `${holes.slice(0, -1).join(", ")} and ${holes[holes.length - 1]}`;
}

/**
 * A scan that read, but not all of it with confidence: which holes to check
 * before the round is saved. Pure; the caller works out which holes are unsure.
 */
function ScanNeedsReview({ holes, onReview, className }: ScanNeedsReviewProps) {
  const plural = holes.length === 1 ? "" : "s";
  return (
    <div
      data-slot="scan-needs-review"
      role="status"
      className={cn(
        "flex flex-col gap-2.5 rounded-xl border-2 border-status-warning bg-card p-5",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-status-warning-base text-lg leading-none font-bold text-status-warning-on-base"
        >
          !
        </span>
        <p className="text-lg font-bold text-foreground">
          {holes.length} hole{plural} to check
        </p>
      </div>
      <p className="text-sm text-foreground-secondary">
        We weren’t sure about hole{plural} {listHoles(holes)}. They’re marked on the card.
      </p>
      <Button className="mt-auto h-10 rounded-card font-semibold" onClick={onReview}>
        Review holes
      </Button>
    </div>
  );
}

export { ScanNeedsReview };

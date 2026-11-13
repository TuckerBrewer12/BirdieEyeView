import type { ReactNode } from "react";
import { cn } from "@/brand/cn";
import { scoreCountTextClass, scoreFillClass, scoreMarkClass, type ScoreKey } from "@/brand/theme";

interface ScoreKindLabelProps {
  kind: ScoreKey;
  /**
   * `mark` (the default): a round dot in the kind's ink colour, par's quiet grey. `fill`: a small
   * square in the kind's fill, matching a bar's segment, as a legend's key does.
   */
  swatch?: "mark" | "fill";
  /** `kind` (the default) writes the words in the kind's colour; `inherit` leaves them to the surroundings. */
  ink?: "kind" | "inherit";
  className?: string;
  children: ReactNode;
}

/** Words that name a kind of score, led by its colour: a total's "Birdies", a legend's "bogey". */
function ScoreKindLabel({ kind, swatch = "mark", ink = "kind", className, children }: ScoreKindLabelProps) {
  return (
    <span
      data-slot="score-kind-label"
      data-kind={kind}
      className={cn("inline-flex items-center gap-1.5", ink === "kind" && scoreCountTextClass(kind), className)}
    >
      <span
        aria-hidden
        className={cn("size-2 shrink-0", swatch === "fill" ? ["rounded-xs", scoreFillClass(kind)] : ["rounded-full", scoreMarkClass(kind)])}
      />
      {children}
    </span>
  );
}

export { ScoreKindLabel };
export type { ScoreKindLabelProps };

import type { ReactNode } from "react";
import { cn } from "@/brand/cn";
import { scoreCountTextClass, scoreFillClass, scoreMarkClass, type ScoreKey } from "@/brand/theme";

interface ScoreKindLabelProps {
  kind: ScoreKey;
  swatch?: "mark" | "fill";
  ink?: "kind" | "inherit";
  className?: string;
  children: ReactNode;
}

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

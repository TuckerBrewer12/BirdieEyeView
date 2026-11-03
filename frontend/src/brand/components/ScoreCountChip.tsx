import * as React from "react";
import { cn } from "@/brand/cn";
import { scoreFillClass, scoreOnFillClass, type ScoreKey } from "@/brand/theme";

interface ScoreCountChipProps extends React.ComponentProps<"div"> {
  kind: ScoreKey;
  count: number;
}

function ScoreCountChip({ kind, count, className, children, ...props }: ScoreCountChipProps) {
  return (
    <div
      data-slot="score-count-chip"
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-chip",
        scoreFillClass(kind),
        scoreOnFillClass(kind),
        className,
      )}
      {...props}
    >
      <span className="font-mono text-label font-semibold">{count}</span>
      <span className="text-meta font-bold tracking-chip">{children}</span>
    </div>
  );
}

export { ScoreCountChip };

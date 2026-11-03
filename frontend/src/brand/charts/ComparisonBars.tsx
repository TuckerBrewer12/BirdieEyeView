import { cn } from "@/brand/cn";

interface ComparisonBar {
  /** Beside the bar: "Par 3". */
  label: string;
  value: number;
  /** Where the tick stands: the figure to beat or match. */
  target: number;
}

interface ComparisonBarsProps {
  bars: ComparisonBar[];
  /** The value that fills a whole track. */
  max?: number;
  /** Which side of the target is the good one: golf's averages to par are better lower. */
  better?: "lower" | "higher";
  /** How a figure is written, for the number at the end of the row and the screen reader. */
  format: (value: number) => string;
  className?: string;
}

/** A few figures each against its own target: a bar to the value, a tick at the target, the figure written beside it. */
export function ComparisonBars({ bars, max = 1, better = "lower", format, className }: ComparisonBarsProps) {
  const share = (value: number) => `${Math.min(100, Math.max(0, (value / max) * 100))}%`;

  return (
    <div data-slot="comparison-bars" className={cn("flex flex-col gap-3", className)}>
      {bars.map((bar) => {
        const good = better === "lower" ? bar.value <= bar.target : bar.value >= bar.target;
        return (
          <div key={bar.label} className="flex items-center gap-2.5">
            <span className="w-11 shrink-0 text-body font-semibold text-foreground-secondary">{bar.label}</span>
            <div
              role="img"
              aria-label={`${bar.label}: ${format(bar.value)}, target ${format(bar.target)}`}
              className="relative h-2.5 min-w-0 flex-1 rounded-full bg-muted"
            >
              <div
                className={cn(
                  "absolute inset-y-0 left-0 rounded-full",
                  good ? "bg-score-birdie-base" : "bg-score-bogey-base",
                )}
                style={{ width: share(bar.value) }}
              />
              <div
                className="absolute -inset-y-1 w-0.5 -translate-x-1/2 bg-foreground"
                style={{ left: share(bar.target) }}
              />
            </div>
            <b className={cn("w-11 shrink-0 text-right text-sm", good ? "text-status-success" : "text-status-danger")}>
              {format(bar.value)}
            </b>
          </div>
        );
      })}
    </div>
  );
}

export type { ComparisonBar, ComparisonBarsProps };

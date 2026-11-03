import { cn } from "@/brand/cn";
import type { RadarAxis } from "@/brand/charts/RadarChart";

interface RadarSummaryProps {
  /** The same axes the chart draws. Axes without a comparison count toward neither side. */
  axes: RadarAxis[];
  /** Who the shape is held up against, as it reads after "ahead of": "a 10 handicap". */
  against: string;
  className?: string;
}

/**
 * What the radar adds up to, for the column beside it: how many areas are ahead of the
 * comparison, the three biggest gaps where behind, and the legend for the two outlines.
 */
function RadarSummary({ axes, against, className }: RadarSummaryProps) {
  const compared = axes.filter((axis) => axis.benchmark != null);
  const ahead = compared.filter((axis) => axis.value >= axis.benchmark!).length;
  const behind = compared
    .filter((axis) => axis.value < axis.benchmark!)
    .sort((a, b) => a.value - a.benchmark! - (b.value - b.benchmark!))
    .slice(0, 3);

  return (
    <div data-slot="radar-summary" className={cn("flex min-w-0 flex-col gap-3.5", className)}>
      <div>
        <div className="text-2xl leading-none font-bold tracking-stat">
          {ahead} <span className="text-base font-semibold text-muted-foreground">of {compared.length}</span>
        </div>
        <div className="mt-1 text-body-sm text-foreground-secondary">areas ahead of {against}</div>
      </div>
      {behind.length > 0 && (
        <>
          <div className="h-px bg-chart-grid" />
          <div className="flex flex-col gap-2">
            <div className="text-eyebrow uppercase text-muted-foreground">Biggest gaps</div>
            {behind.map((axis) => (
              <div key={axis.label} className="flex flex-wrap justify-between gap-x-2 text-body">
                <span>{axis.label}</span>
                <b className="whitespace-nowrap text-score-bogey">
                  {axis.valueLabel} vs {axis.benchmarkLabel}
                </b>
              </div>
            ))}
          </div>
        </>
      )}
      <div className="flex flex-col gap-1.5 text-label text-foreground-secondary">
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="h-0.5 w-4 rounded-full bg-primary" />
          You
        </span>
        {compared.length > 0 && (
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="w-4 border-t-2 border-dashed border-muted-foreground" />
            Benchmark
          </span>
        )}
      </div>
    </div>
  );
}

export { RadarSummary };

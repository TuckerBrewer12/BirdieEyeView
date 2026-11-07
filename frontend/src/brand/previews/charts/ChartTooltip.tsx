import { ChartTooltip } from "@/brand/charts/ChartTooltip";
import { ToParFigure } from "@/brand/components/ToParFigure";

/**
 * The card over a chart: above a point that opens right, above one near the right edge that
 * opens left, and the small one-line card a dot on the target shows.
 */
export default function ChartTooltipPreview() {
  return (
    <div className="relative h-chart rounded-card border border-border bg-card">
      <ChartTooltip anchor={{ left: "5%", top: "50%", flip: false }} id="score">
        <div className="mb-1 text-sm font-bold text-card-foreground">Round 12</div>
        <div className="mb-1.5 max-w-40 truncate text-label text-muted-foreground">Half Moon Bay</div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">Score</span>
          <span className="flex items-baseline gap-1.5 font-semibold text-card-foreground">
            78
            <ToParFigure toPar={6} />
          </span>
        </div>
      </ChartTooltip>
      <ChartTooltip anchor={{ left: "95%", top: "50%", flip: true }} id="handicap">
        <div className="mb-1 text-sm font-bold text-card-foreground">Round 20</div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">HI</span>
          <span className="font-semibold text-score-double">12.4</span>
        </div>
      </ChartTooltip>
      <ChartTooltip anchor={{ left: "30%", top: "95%", flip: false }} id="target" size="sm">
        <div className="font-semibold text-card-foreground">372 yds</div>
        <div className="text-muted-foreground">Bogey · +1</div>
      </ChartTooltip>
    </div>
  );
}

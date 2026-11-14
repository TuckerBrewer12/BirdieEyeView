import { ChartTooltip } from "@/brand/charts/ChartTooltip";

export default function ChartTooltipPreview() {
  return (
    <div className="flex flex-col gap-6">
      <div className="relative h-36 rounded-xl bg-card">
        <ChartTooltip id="left" at={{ x: 0.2, y: 0.9 }} className="min-w-32">
          <div className="text-sm font-bold text-card-foreground">Round 12</div>
          <div className="text-muted-foreground">Score 78</div>
        </ChartTooltip>
      </div>
      <div className="relative h-36 rounded-xl bg-card">
        <ChartTooltip id="right" at={{ x: 0.85 }} className="min-w-40">
          <div className="text-sm font-bold text-card-foreground">Hole 14</div>
          <div className="text-muted-foreground">Greens 17%</div>
        </ChartTooltip>
      </div>
      <div className="relative h-24 rounded-xl bg-card">
        <ChartTooltip id="small" at={{ x: 0.3, y: 0.9 }} flipAt={0.5} size="sm">
          <div className="font-semibold text-card-foreground">Hole 7</div>
          <div className="text-muted-foreground">Birdie · −1</div>
        </ChartTooltip>
      </div>
    </div>
  );
}

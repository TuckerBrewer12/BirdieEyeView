import { ProgressRing } from "@/brand/charts/ProgressRing";
import { Sparkline } from "@/brand/charts/Sparkline";
import { Card } from "@/brand/components/Card";

export default function ProgressRingPreview() {
  return (
    <div className="flex flex-col gap-3">
      <Card className="flex-row items-center gap-4.5 px-4">
        <ProgressRing value={82} aria-label="Goal progress" />
        <div className="flex min-w-0 flex-col gap-2.5">
          <div className="text-label font-semibold text-muted-foreground">Progress ring · goals only</div>
          <div>
            <div className="text-base font-semibold text-foreground">Break 80</div>
            <div className="text-body text-foreground-secondary">On track</div>
          </div>
          <div className="flex items-center gap-2.5">
            <Sparkline className="w-24 shrink-0" series={[{ values: [19, 16, 17, 12, 13, 9, 6], tone: "birdie" }]} />
            <span className="text-label font-semibold text-muted-foreground">Sparkline · trend only, no axes</span>
          </div>
        </div>
      </Card>
      <Card className="flex-row items-center gap-4.5 px-4">
        <ProgressRing value={0} aria-label="Goal not started" />
        <ProgressRing value={100} aria-label="Goal reached" />
        <ProgressRing value={null} aria-label="Goal not measured" />
        <ProgressRing value={35} aria-label="Goal progress">
          7/20
        </ProgressRing>
      </Card>
    </div>
  );
}

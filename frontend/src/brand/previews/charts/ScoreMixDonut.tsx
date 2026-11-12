import { ScoreMixDonut } from "@/brand/charts/ScoreMixDonut";
import { Card } from "@/brand/components/Card";
import { populatedDashboard } from "@/testing/fixtures/dashboard";

export default function ScoreMixDonutPreview() {
  return (
    <div className="flex flex-col gap-3">
      <Card className="gap-2 px-4">
        <div className="text-label font-semibold text-muted-foreground">The last five rounds</div>
        <ScoreMixDonut mix={populatedDashboard.recent_score_mix} />
      </Card>
      <Card className="gap-2 px-4">
        <div className="text-label font-semibold text-muted-foreground">A tidy round</div>
        <ScoreMixDonut mix={{ eagle: 5, birdie: 20, par: 60, bogey: 15, double: 0, triple: 0, quad: 0 }} />
      </Card>
    </div>
  );
}

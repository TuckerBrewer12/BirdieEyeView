import { ScoreMixBar } from "@/brand/charts/ScoreMixBar";
import { Card } from "@/brand/components/Card";
import { Round } from "@/domain";
import { populatedDashboard } from "@/testing/fixtures/dashboard";
import { populatedRounds } from "@/testing/fixtures/rounds";

const [overPar, , best] = populatedRounds.map(Round.fromSummary);

export default function ScoreMixBarPreview() {
  return (
    <div className="flex flex-col gap-3">
      <Card className="gap-2 px-4">
        <div className="text-label font-semibold text-muted-foreground">A round's holes, counted</div>
        <ScoreMixBar mix={best.scoreCounts} counted />
      </Card>
      <Card className="gap-2 px-4">
        <div className="text-label font-semibold text-muted-foreground">Shares of every hole</div>
        <ScoreMixBar mix={populatedDashboard.recent_score_mix} />
      </Card>
      <Card className="gap-2 px-4">
        <div className="text-label font-semibold text-muted-foreground">A rough round</div>
        <ScoreMixBar mix={overPar.scoreCounts} counted />
      </Card>
    </div>
  );
}

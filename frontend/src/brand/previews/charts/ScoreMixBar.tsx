import { ScoreMixBar, ScoreMixLegend } from "@/brand/charts/ScoreMixBar";
import { Card } from "@/brand/components/Card";
import { Round } from "@/domain";
import { populatedDashboard } from "@/testing/fixtures/dashboard";
import { populatedRounds } from "@/testing/fixtures/rounds";

const hit = { eagle: 0, birdie: 16, par: 66, bogey: 18, double: 0, triple: 0, quad: 0 };
const missed = { eagle: 0, birdie: 0, par: 31, bogey: 50, double: 18, triple: 0.6, quad: 0.4 };

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
      <Card className="gap-3 px-4">
        <div className="text-label font-semibold text-muted-foreground">Tall, triples and worse folded, one key under two bars</div>
        <ScoreMixBar mix={hit} fold size="lg" legend="none" />
        <ScoreMixBar mix={missed} fold size="lg" legend="none" />
        <ScoreMixLegend mixes={[hit, missed]} fold />
      </Card>
      <Card className="gap-2 px-4">
        <div className="text-label font-semibold text-muted-foreground">Inline from md, with a key</div>
        <ScoreMixBar mix={missed} fold legend="key" inline />
      </Card>
    </div>
  );
}

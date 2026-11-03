import { ScoreMixBar } from "@/brand/charts/ScoreMixBar";
import { Card } from "@/brand/components/Card";
import type { ScoreMix } from "@/domain/score";

const counts = (partial: Partial<ScoreMix>): ScoreMix => ({
  eagle: 0,
  birdie: 0,
  par: 0,
  bogey: 0,
  double: 0,
  triple: 0,
  quad: 0,
  ...partial,
});

export default function ScoreMixBarPreview() {
  return (
    <div className="flex flex-col gap-3">
      <Card className="gap-2.5 px-4">
        <div className="text-label font-semibold text-muted-foreground">Score mix · replaces the three count pills</div>
        <ScoreMixBar mix={counts({ birdie: 1, par: 10, bogey: 6, double: 1 })} counted />
      </Card>
      <Card className="gap-2.5 px-4">
        <div className="text-label font-semibold text-muted-foreground">Shares, when the holes are not known</div>
        <ScoreMixBar mix={{ eagle: 1.2, birdie: 18.8, par: 52, bogey: 22, double: 4, triple: 1.6, quad: 0.4 }} />
      </Card>
      <Card className="gap-2.5 px-4">
        <div className="text-label font-semibold text-muted-foreground">A rough round</div>
        <ScoreMixBar mix={counts({ par: 2, bogey: 6, double: 5, triple: 3, quad: 2 })} counted />
      </Card>
    </div>
  );
}

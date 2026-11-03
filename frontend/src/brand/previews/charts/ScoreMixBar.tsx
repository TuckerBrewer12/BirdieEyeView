import { ScoreMixBar } from "@/brand/charts/ScoreMixBar";
import { Card } from "@/brand/components/Card";
import type { ScoreMix } from "@/domain/score";

/** The share of the holes each kind took, from how many holes it took. */
function shares(counts: Partial<ScoreMix>, holes: number): ScoreMix {
  const share = (n = 0) => (n * 100) / holes;
  return {
    eagle: share(counts.eagle),
    birdie: share(counts.birdie),
    par: share(counts.par),
    bogey: share(counts.bogey),
    double: share(counts.double),
    triple: share(counts.triple),
    quad: share(counts.quad),
  };
}

export default function ScoreMixBarPreview() {
  return (
    <div className="flex flex-col gap-3">
      <Card className="gap-2.5 px-4">
        <div className="text-label font-semibold text-muted-foreground">Score mix · replaces the three count pills</div>
        <ScoreMixBar mix={shares({ birdie: 1, par: 10, bogey: 6, double: 1 }, 18)} holes={18} />
      </Card>
      <Card className="gap-2.5 px-4">
        <div className="text-label font-semibold text-muted-foreground">Shares, when the holes are not known</div>
        <ScoreMixBar mix={{ eagle: 1.2, birdie: 18.8, par: 52, bogey: 22, double: 4, triple: 1.6, quad: 0.4 }} />
      </Card>
      <Card className="gap-2.5 px-4">
        <div className="text-label font-semibold text-muted-foreground">A rough round</div>
        <ScoreMixBar mix={shares({ par: 2, bogey: 6, double: 5, triple: 3, quad: 2 }, 18)} holes={18} />
      </Card>
    </div>
  );
}

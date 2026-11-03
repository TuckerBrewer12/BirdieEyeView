import { HoleStrip } from "@/brand/charts/HoleStrip";
import { Card } from "@/brand/components/Card";
import { scoreKind } from "@/domain/score";
import type { HoleSummary } from "@/domain";

const par = [4, 4, 3, 5, 4, 4, 3, 4, 5, 4, 3, 4, 5, 4, 4, 3, 4, 5];
// Strokes over par on each hole.
const toPar = [1, 0, 0, 1, 1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 2, 0, -1];

const holes: HoleSummary[] = toPar.map((over, i) => {
  const strokes = par[i] + over;
  return { hole: i + 1, strokes, kind: scoreKind(strokes, par[i]) };
});

// Seven holes scored, two still to play.
const unfinished: HoleSummary[] = holes
  .slice(0, 9)
  .map((hole) => (hole.hole > 7 ? { ...hole, strokes: null, kind: null } : hole));

export default function HoleStripPreview() {
  return (
    <div className="flex flex-col gap-3">
      <Card className="gap-2.5 px-4">
        <div className="text-label font-semibold text-muted-foreground">Hole strip · one cell per hole</div>
        <HoleStrip holes={holes} front={40} back={38} />
      </Card>
      <Card className="gap-2.5 px-4">
        <div className="text-label font-semibold text-muted-foreground">Nine holes, two still to play</div>
        <HoleStrip holes={unfinished} />
      </Card>
    </div>
  );
}

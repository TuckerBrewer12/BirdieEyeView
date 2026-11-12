import { ColumnBars } from "@/brand/charts/ColumnBars";
import { Card } from "@/brand/components/Card";

const byHandicap = [0.7, 0.15, 0.55, 0.55, 0.95, 0.85, 0.8, 0.65, 0.6, 0.7, 0.85, 0.55, 0.55, 0.2, 0.95, 0.55, 0.96, 0.85];
const hardest = new Set([5, 15, 17]);
const threePutts = [1, 3, 2, 4, 1, 2, 2, 0, 3, 2, 1, 2, 0, 3, 2, 1, 1, 3, 2, 1, 0, 2, 1, 1];

export default function ColumnBarsPreview() {
  return (
    <div className="flex flex-col gap-3">
      <Card className="gap-3 px-4">
        <div className="text-label font-semibold text-muted-foreground">Holes by handicap, the hardest three marked</div>
        <ColumnBars
          aria-label="Average to par by hole handicap"
          columns={byHandicap.map((value, i) => ({
            key: String(i + 1),
            value,
            marked: hardest.has(i + 1),
            label: String(i + 1),
          }))}
        />
      </Card>
      <Card className="gap-3 px-4">
        <div className="text-label font-semibold text-muted-foreground">Three-putts a round, three or more marked; none still shows</div>
        <ColumnBars
          aria-label="Three-putts each round"
          columns={threePutts.map((value, i) => ({ key: String(i), value, marked: value >= 3 }))}
        />
      </Card>
    </div>
  );
}

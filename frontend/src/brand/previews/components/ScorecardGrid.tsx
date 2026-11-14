import type { ReactNode } from "react";
import { Card } from "@/brand/components/Card";
import { ScorecardGrid, type ScorecardRow } from "@/brand/components/ScorecardGrid";
import { formatScorecardFigure as show } from "@/domain/format";

interface PreviewHole {
  hole: number;
  par: number;
  putts: number | null;
}

interface PreviewNine {
  side: "front" | "back";
  holes: PreviewHole[];
  par: number;
}

const PARS = [4, 4, 3, 5, 4, 4, 4, 3, 5, 4, 4, 3, 5, 4, 4, 4, 3, 5];
const nine = (side: PreviewNine["side"], from: number): PreviewNine => {
  const holes = PARS.slice(from, from + 9).map((par, i) => ({ hole: from + i + 1, par, putts: i === 4 ? null : 2 }));
  return { side, holes, par: 36 };
};
const NINES = [nine("front", 0), nine("back", 9)];

const ROWS: ScorecardRow<PreviewHole, PreviewNine>[] = [
  {
    key: "par",
    label: "Par",
    className: "h-9 text-body-sm font-semibold text-foreground",
    cell: (hole) => show(hole.par),
    nine: (part) => show(part.par),
    tot: "72",
  },
  {
    key: "putts",
    label: "Putts",
    wideOnly: true,
    className: "h-8 text-body-sm text-foreground-secondary",
    cell: (hole) => show(hole.putts),
  },
];

function Panel({ children }: { children: ReactNode }) {
  return (
    <Card className="gap-0 overflow-x-auto py-0">
      <div className="min-w-scorecard-round px-3 pt-1 pb-2.5">{children}</div>
    </Card>
  );
}

export default function ScorecardGridPreview() {
  return (
    <div data-testid="brand-frame" className="fixed inset-0 flex flex-col gap-6 overflow-auto bg-background p-6">
      <Panel>
        <ScorecardGrid nines={NINES} nineLabel={(part) => (part.side === "front" ? "Out" : "In")} withTot rows={ROWS} />
      </Panel>
      <Card className="max-w-sm gap-0 py-0 pb-1">
        <ScorecardGrid nines={NINES.slice(1)} nineLabel={() => "In"} withTot={false} rows={ROWS} />
      </Card>
    </div>
  );
}

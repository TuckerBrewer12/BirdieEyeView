import { ScorecardCard } from "@/brand/components/ScorecardCard";
import { ScorecardGrid, type ScorecardRow } from "@/brand/components/ScorecardGrid";
import { formatScorecardFigure as show } from "@/domain/format";

interface PreviewHole {
  hole: number;
  par: number;
}

interface PreviewNine {
  side: "front" | "back";
  holes: PreviewHole[];
}

const PARS = [4, 4, 3, 5, 4, 4, 4, 3, 5, 4, 4, 3, 5, 4, 4, 4, 3, 5];
const NINES: PreviewNine[] = [
  { side: "front", holes: PARS.slice(0, 9).map((par, i) => ({ hole: i + 1, par })) },
  { side: "back", holes: PARS.slice(9).map((par, i) => ({ hole: i + 10, par })) },
];
const ROWS: ScorecardRow<PreviewHole, PreviewNine>[] = [
  {
    key: "par",
    label: "Par",
    className: "h-9 text-body-sm font-semibold text-foreground",
    cell: (hole) => show(hole.par),
    nine: () => "36",
    tot: "72",
  },
];

/** The green bar over the grid: all eighteen across from `md`, the two nines stacked on a phone. */
export default function ScorecardCardPreview() {
  return (
    <ScorecardCard bar="Blue tees · 6,500 yds · 72.4 / 130">
      {(side) => (
        <ScorecardGrid
          nines={side ? NINES.filter((part) => part.side === side) : NINES}
          nineLabel={(part) => (part.side === "front" ? "Out" : "In")}
          withTot={side == null}
          rows={ROWS}
        />
      )}
    </ScorecardCard>
  );
}

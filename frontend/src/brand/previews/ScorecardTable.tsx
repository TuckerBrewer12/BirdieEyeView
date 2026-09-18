import { ScorecardTable, type ScorecardHole } from "@/brand/components/ScorecardTable";

const PAR = [4, 4, 3, 5, 4, 4, 3, 5, 4];
const STROKES = [5, 4, 3, 7, 4, 5, 2, 6, 4];

const front: ScorecardHole[] = PAR.map((par, i) => ({
  hole: i + 1,
  par,
  strokes: STROKES[i],
  putts: [2, 1, 2, 3, 2, 2, 1, 2, 2][i],
  greenInRegulation: [false, true, true, false, true, false, true, false, true][i],
  shotsToGreen: null,
}));

/** A card the scan read nothing but scores from — the common case. */
const scoresOnly: ScorecardHole[] = front.map((hole) => ({
  ...hole,
  putts: null,
  greenInRegulation: null,
}));

export default function ScorecardTablePreview() {
  return (
    <>
      <ScorecardTable holes={front} label="OUT" />
      <ScorecardTable holes={scoresOnly} label="IN" roundTotal={{ par: 72, strokes: 84 }} />
    </>
  );
}

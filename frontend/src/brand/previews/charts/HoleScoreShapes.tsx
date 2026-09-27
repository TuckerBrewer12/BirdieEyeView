import { HoleScoreShapes } from "@/brand/charts/HoleScoreShapes";
import { Round } from "@/domain";
import { populatedRounds } from "@/testing/fixtures/rounds";

const [overPar, , best] = populatedRounds.map(Round.fromSummary);
const partlyScored = overPar.withStrokes({
  14: { strokes: null },
  15: { strokes: null },
  16: { strokes: null },
  17: { strokes: null },
  18: { strokes: null },
});
const frontNineOnly = new Round({ ...overPar, holes: overPar.frontNine.holes });

export default function HoleScoreShapesPreview() {
  return (
    <>
      <HoleScoreShapes round={best} />
      <HoleScoreShapes round={partlyScored} />
      <HoleScoreShapes round={frontNineOnly} />
    </>
  );
}

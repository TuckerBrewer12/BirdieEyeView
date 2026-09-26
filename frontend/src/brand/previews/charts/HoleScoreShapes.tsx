import { HoleScoreShapes } from "@/brand/charts/HoleScoreShapes";
import { frontNine, roundFromSummary } from "@/domain";
import { populatedRounds } from "@/testing/fixtures/rounds";

const [overPar, , best] = populatedRounds.map(roundFromSummary);
const partlyScored = overPar.holes.map((hole) => (hole.hole > 13 ? { ...hole, strokes: null } : hole));

export default function HoleScoreShapesPreview() {
  return (
    <>
      <HoleScoreShapes holes={best.holes} />
      <HoleScoreShapes holes={partlyScored} />
      <HoleScoreShapes holes={frontNine(overPar.holes)} />
    </>
  );
}

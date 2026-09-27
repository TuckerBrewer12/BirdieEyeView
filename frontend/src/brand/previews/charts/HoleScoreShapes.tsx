import { HoleScoreShapes } from "@/brand/charts/HoleScoreShapes";
import { Round } from "@/domain";
import { summaryResponse } from "@/testing/fakes/roundResponses";
import { populatedRounds, storedRounds } from "@/testing/fixtures/rounds";

const best = Round.fromSummary(populatedRounds[2]);
const overPar = storedRounds[0];
const partlyScored = Round.fromSummary(
  summaryResponse({
    ...overPar,
    hole_scores: overPar.hole_scores.map((hole) => (hole.hole_number > 13 ? { ...hole, strokes: null } : hole)),
  }),
);
const frontNineOnly = Round.fromSummary(
  summaryResponse({ ...overPar, hole_scores: overPar.hole_scores.slice(0, 9) }),
);

export default function HoleScoreShapesPreview() {
  return (
    <>
      <HoleScoreShapes round={best} />
      <HoleScoreShapes round={partlyScored} />
      <HoleScoreShapes round={frontNineOnly} />
    </>
  );
}

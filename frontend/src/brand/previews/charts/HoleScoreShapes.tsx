import { HoleScoreShapes } from "@/brand/charts/HoleScoreShapes";
import { summaryScorecard } from "@/domain";
import { populatedRounds } from "@/testing/fixtures/rounds";

const round = populatedRounds[0];
const strip = round.hole_scores_summary ?? [];

const partlyScored = summaryScorecard({
  ...round,
  hole_scores_summary: strip.map((hole, i) => (i > 12 ? { ...hole, s: null } : hole)),
});
const frontNineOnly = summaryScorecard({ ...round, hole_scores_summary: strip.slice(0, 9) });

export default function HoleScoreShapesPreview() {
  return (
    <>
      <HoleScoreShapes scorecard={summaryScorecard(populatedRounds[2])} />
      <HoleScoreShapes scorecard={partlyScored} />
      <HoleScoreShapes scorecard={frontNineOnly} />
    </>
  );
}

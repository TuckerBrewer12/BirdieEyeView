import { HoleScoreShapes } from "@/brand/charts/HoleScoreShapes";
import { holeResult, summaryHoles } from "@/domain";
import { populatedRounds } from "@/testing/fixtures/rounds";

const partlyScored = summaryHoles(populatedRounds[0]).map((hole, i) =>
  i > 12 ? holeResult(hole.hole, null, hole.par) : hole,
);

export default function HoleScoreShapesPreview() {
  return (
    <>
      <HoleScoreShapes holes={summaryHoles(populatedRounds[2])} />
      <HoleScoreShapes holes={partlyScored} />
      <HoleScoreShapes holes={summaryHoles(populatedRounds[0]).slice(0, 9)} />
    </>
  );
}

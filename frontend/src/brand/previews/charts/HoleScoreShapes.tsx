import { HoleScoreShapes } from "@/brand/charts/HoleScoreShapes";
import type { HoleScore } from "@/brand/charts/HoleScoreBars";
import { populatedRounds } from "@/testing/fixtures/rounds";

function holesOf(index: number): HoleScore[] {
  return (populatedRounds[index].hole_scores_summary ?? []).map((hole) => ({
    hole: hole.h,
    strokes: hole.s,
    par: hole.p,
  }));
}

const partlyScored = holesOf(0).map((hole, i) =>
  i > 12 ? { ...hole, strokes: null } : hole,
);

export default function HoleScoreShapesPreview() {
  return (
    <>
      <HoleScoreShapes holes={holesOf(2)} />
      <HoleScoreShapes holes={partlyScored} />
      <HoleScoreShapes holes={holesOf(0).slice(0, 9)} />
    </>
  );
}

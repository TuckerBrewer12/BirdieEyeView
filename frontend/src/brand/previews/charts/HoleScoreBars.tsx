import { HoleScoreBars, type HoleScore } from "@/brand/charts/HoleScoreBars";
import { populatedRounds } from "@/testing/fixtures/rounds";

function holesOf(index: number): HoleScore[] {
  return (populatedRounds[index].hole_scores_summary ?? []).map((hole) => ({
    hole: hole.h,
    strokes: hole.s,
    par: hole.p,
  }));
}

export default function HoleScoreBarsPreview() {
  return (
    <>
      <HoleScoreBars holes={holesOf(0)} />
      <HoleScoreBars holes={holesOf(2)} />
      <HoleScoreBars holes={holesOf(0).slice(0, 9)} />
    </>
  );
}

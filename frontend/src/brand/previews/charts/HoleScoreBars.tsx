import { HoleScoreBars } from "@/brand/charts/HoleScoreBars";
import { summaryScorecard } from "@/domain";
import { populatedRounds } from "@/testing/fixtures/rounds";

export default function HoleScoreBarsPreview() {
  return (
    <>
      <HoleScoreBars holes={summaryScorecard(populatedRounds[0]).holes} />
      <HoleScoreBars holes={summaryScorecard(populatedRounds[2]).holes} />
      <HoleScoreBars holes={summaryScorecard(populatedRounds[0]).frontNine.holes} />
    </>
  );
}

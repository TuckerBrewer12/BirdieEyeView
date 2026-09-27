import { HoleScoreBars } from "@/brand/charts/HoleScoreBars";
import { Round } from "@/domain";
import { populatedRounds } from "@/testing/fixtures/rounds";

const [overPar, , best] = populatedRounds.map(Round.fromSummary);

export default function HoleScoreBarsPreview() {
  return (
    <>
      <HoleScoreBars holes={overPar.holes} />
      <HoleScoreBars holes={best.holes} />
      <HoleScoreBars holes={overPar.frontNine.holes} />
    </>
  );
}

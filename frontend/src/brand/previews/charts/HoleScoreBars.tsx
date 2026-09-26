import { HoleScoreBars } from "@/brand/charts/HoleScoreBars";
import { frontNine, roundFromSummary } from "@/domain";
import { populatedRounds } from "@/testing/fixtures/rounds";

const [overPar, , best] = populatedRounds.map(roundFromSummary);

export default function HoleScoreBarsPreview() {
  return (
    <>
      <HoleScoreBars holes={overPar.holes} />
      <HoleScoreBars holes={best.holes} />
      <HoleScoreBars holes={frontNine(overPar.holes)} />
    </>
  );
}

import { HoleScoreBars } from "@/brand/charts/HoleScoreBars";
import { Round } from "@/domain";
import { populatedRounds } from "@/testing/fixtures/rounds";

const [overPar, , best] = populatedRounds.map(Round.fromSummary);

export default function HoleScoreBarsPreview() {
  return (
    <>
      <div className="flex gap-3">
        <HoleScoreBars holes={overPar.frontNine.holes} className="flex-1" />
        <HoleScoreBars holes={overPar.backNine.holes} className="flex-1" />
      </div>
      <div className="flex gap-3">
        <HoleScoreBars holes={best.frontNine.holes} className="flex-1" />
        <HoleScoreBars holes={best.backNine.holes} className="flex-1" />
      </div>
      <HoleScoreBars holes={overPar.frontNine.holes} variant="profile" />
      <HoleScoreBars holes={best.backNine.holes} variant="profile" />
    </>
  );
}

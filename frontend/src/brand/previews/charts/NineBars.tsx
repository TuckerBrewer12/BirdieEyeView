import { NineBars } from "@/brand/charts/NineBars";
import { Round } from "@/domain";
import { populatedRounds } from "@/testing/fixtures/rounds";

const [overPar, evenPar, best] = populatedRounds.map(Round.fromSummary);

export default function NineBarsPreview() {
  return (
    <>
      <div className="flex gap-2.5">
        <NineBars holes={overPar.frontNine.holes} />
        <NineBars holes={overPar.backNine.holes} />
      </div>
      <div className="flex gap-2.5">
        <NineBars holes={evenPar.frontNine.holes} />
        <NineBars holes={evenPar.backNine.holes} />
      </div>
      <div className="flex gap-2.5">
        <NineBars holes={best.frontNine.holes} />
        <NineBars holes={best.backNine.holes} />
      </div>
    </>
  );
}

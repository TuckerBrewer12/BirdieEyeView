import { HoleScoreBars } from "@/brand/charts/HoleScoreBars";
import { summaryHoles } from "@/domain";
import { populatedRounds } from "@/testing/fixtures/rounds";

export default function HoleScoreBarsPreview() {
  return (
    <>
      <HoleScoreBars holes={summaryHoles(populatedRounds[0])} />
      <HoleScoreBars holes={summaryHoles(populatedRounds[2])} />
      <HoleScoreBars holes={summaryHoles(populatedRounds[0]).slice(0, 9)} />
    </>
  );
}

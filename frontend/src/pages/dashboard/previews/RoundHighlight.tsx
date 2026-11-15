import { Round } from "@/domain";
import { populatedRounds } from "@/testing/fixtures/rounds";
import { RoundHighlight } from "../components/RoundHighlight";

const [overPar, evenPar, best] = populatedRounds.map(Round.fromSummary);

export default function RoundHighlightPreview() {
  return (
    <div className="flex flex-col gap-6 bg-background p-5">
      <RoundHighlight round={best} onClick={() => {}} />
      <RoundHighlight round={evenPar} onClick={() => {}} />
      <RoundHighlight round={overPar} onClick={() => {}} />
      <RoundHighlight round={null} />
    </div>
  );
}

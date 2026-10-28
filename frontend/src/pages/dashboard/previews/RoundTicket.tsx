import { Round } from "@/domain";
import { populatedRounds } from "@/testing/fixtures/rounds";
import { RoundTicket } from "../components/RoundTicket";

const [overPar, , best] = populatedRounds.map(Round.fromSummary);

export default function RoundTicketPreview() {
  return (
    <div className="flex flex-col gap-4">
      <RoundTicket round={overPar} onClick={() => {}} />
      <RoundTicket round={best} />
    </div>
  );
}

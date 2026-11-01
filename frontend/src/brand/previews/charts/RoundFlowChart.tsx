import { RoundFlowChart } from "@/brand/charts/RoundFlowChart";
import { Round } from "@/domain";
import { roundResponse } from "@/testing/fakes/roundResponses";
import { storedRounds } from "@/testing/fixtures/rounds";
import { ScrolledToEnd } from "../ScrolledToEnd";

const [overPar, , best] = storedRounds.map((round) => Round.fromDto(roundResponse(round)));

export default function RoundFlowChartPreview() {
  return (
    <>
      <RoundFlowChart round={overPar} />
      <ScrolledToEnd>
        <RoundFlowChart round={overPar} />
      </ScrolledToEnd>
      <ScrolledToEnd>
        <RoundFlowChart round={best} />
      </ScrolledToEnd>
    </>
  );
}

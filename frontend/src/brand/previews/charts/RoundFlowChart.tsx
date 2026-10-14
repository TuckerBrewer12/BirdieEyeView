import { RoundFlowChart } from "@/brand/charts/RoundFlowChart";
import { Round } from "@/domain";
import { populatedRounds } from "@/testing/fixtures/rounds";
import { ScrolledToEnd } from "../ScrolledToEnd";

const [overPar, , best] = populatedRounds.map(Round.fromSummary);

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

import { RoundFlowChart } from "@/brand/charts/RoundFlowChart";
import { Card, CardContent } from "@/brand/components/Card";
import type { Round } from "@/domain";
import { overPar, underPar } from "../roundFlowRounds";
import { ScrolledToEnd } from "../ScrolledToEnd";

function Flow({ round }: { round: Round }) {
  return (
    <Card>
      <CardContent>
        <RoundFlowChart round={round} />
      </CardContent>
    </Card>
  );
}

/** At a phone's width the plot scrolls: the start of a round, the end of it, and an under-par round's end. */
export default function RoundFlowChartScrolledPreview() {
  return (
    <>
      <Flow round={overPar} />
      <ScrolledToEnd>
        <Flow round={overPar} />
      </ScrolledToEnd>
      <ScrolledToEnd>
        <Flow round={underPar} />
      </ScrolledToEnd>
    </>
  );
}

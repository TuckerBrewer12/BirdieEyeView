import { RoundFlowChart, RoundFlowFigures } from "@/brand/charts/RoundFlowChart";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/brand/components/Card";
import { Round } from "@/domain";
import { overParRound, underParRound } from "@/testing/fixtures/roundDetails";
import { ScrolledToEnd } from "../ScrolledToEnd";

const overPar = Round.fromDto(overParRound);
const underPar = Round.fromDto(underParRound);

function Flow({ round }: { round: Round }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-semibold">Round flow</CardTitle>
        <CardDescription className="text-body-sm">Running score to par, hole by hole</CardDescription>
        <CardAction>
          <RoundFlowFigures round={round} />
        </CardAction>
      </CardHeader>
      <CardContent>
        <RoundFlowChart round={round} />
      </CardContent>
    </Card>
  );
}

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

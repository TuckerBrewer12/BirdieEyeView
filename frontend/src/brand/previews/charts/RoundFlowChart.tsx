import { RoundFlowChart } from "@/brand/charts/RoundFlowChart";
import { Card, CardContent } from "@/brand/components/Card";
import { Round } from "@/domain";
import { roundResponse } from "@/testing/fakes/roundResponses";
import { storedRounds } from "@/testing/fixtures/rounds";
import { ScrolledToEnd } from "../ScrolledToEnd";

const [template, , best] = storedRounds;

/** Over par from the first hole, a rough stretch at holes 4 to 7, and a birdie to finish. */
const par = [4, 4, 3, 5, 4, 4, 3, 4, 5, 4, 4, 3, 5, 4, 4, 3, 4, 5];
const toPar = [1, 0, 0, 1, 1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 1, 0, -1];
const overPar = Round.fromDto(
  roundResponse({
    ...template,
    hole_scores: template.hole_scores.map((hole, i) => ({
      ...hole,
      par_played: par[i],
      strokes: par[i] + toPar[i],
    })),
  }),
);
const underPar = Round.fromDto(roundResponse(best));

function Flow({ round }: { round: Round }) {
  return (
    <Card>
      <CardContent>
        <RoundFlowChart round={round} />
      </CardContent>
    </Card>
  );
}

export default function RoundFlowChartPreview() {
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

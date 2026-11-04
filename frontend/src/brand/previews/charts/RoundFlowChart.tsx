import { RoundFlowChart } from "@/brand/charts/RoundFlowChart";
import { Card, CardContent } from "@/brand/components/Card";
import { Round } from "@/domain";
import { overParRound } from "@/testing/fixtures/roundDetails";

const overPar = Round.fromDto(overParRound);

/** The whole chart in a card, at the width the round page gives it. */
export default function RoundFlowChartPreview() {
  return (
    <div data-testid="brand-frame" className="fixed inset-0 overflow-auto bg-background p-6">
      <Card className="py-5">
        <CardContent className="px-6">
          <RoundFlowChart round={overPar} />
        </CardContent>
      </Card>
    </div>
  );
}

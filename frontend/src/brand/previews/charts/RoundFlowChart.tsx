import { RoundFlowChart, RoundFlowFigures } from "@/brand/charts/RoundFlowChart";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/brand/components/Card";
import { Round } from "@/domain";
import { overParRound } from "@/testing/fixtures/roundDetails";

const overPar = Round.fromDto(overParRound);

export default function RoundFlowChartPreview() {
  return (
    <div data-testid="brand-frame" className="fixed inset-0 overflow-auto bg-background p-6">
      <Card className="py-5">
          <CardHeader className="px-6">
            <CardTitle className="font-semibold">Round flow</CardTitle>
            <CardDescription className="text-body-sm">Running score to par, hole by hole</CardDescription>
            <CardAction>
              <RoundFlowFigures round={overPar} />
            </CardAction>
          </CardHeader>
        <CardContent className="px-6">
          <RoundFlowChart round={overPar} />
        </CardContent>
      </Card>
    </div>
  );
}

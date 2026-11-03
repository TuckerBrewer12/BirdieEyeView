import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/brand";
import { SVGScoreHandicapTrend, ScoreHandicapLegend } from "@/brand/charts/SVGScoreHandicapTrend";
import { trend } from "../scoreHandicapSample";

/**
 * The dashboard's card at the size it is drawn on the board, 640 by 470. The
 * chart fills the window, as the app shell does, so capture it at that viewport.
 */
export default function SVGScoreHandicapTrendPreview() {
  return (
    <div data-testid="brand-frame" className="fixed inset-0 overflow-auto bg-background p-6">
      <Card className="gap-4 py-5">
        <CardHeader className="px-6">
          <CardTitle className="font-semibold">Score &amp; Handicap</CardTitle>
          <CardDescription className="text-body-sm">Last 20 rounds</CardDescription>
          <CardAction>
            <ScoreHandicapLegend />
          </CardAction>
        </CardHeader>
        <CardContent className="px-6">
          <SVGScoreHandicapTrend data={trend} />
        </CardContent>
      </Card>
    </div>
  );
}

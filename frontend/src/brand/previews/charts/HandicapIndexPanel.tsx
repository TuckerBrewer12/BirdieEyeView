import { Card, CardContent } from "@/brand";
import { HandicapIndexPanel } from "@/brand/charts/HandicapIndexPanel";
import { trend } from "../scoreHandicapSample";

/** Board B, "HI-led": the handicap index and which rounds count, at the board's 640 x 470. */
export default function HandicapIndexPanelPreview() {
  return (
    <div data-testid="brand-frame" className="fixed inset-0 overflow-auto bg-background p-6">
      <Card className="py-5">
        <CardContent className="px-6">
          <HandicapIndexPanel data={trend} />
        </CardContent>
      </Card>
    </div>
  );
}

import { HoleGreensPuttsChart } from "@/brand/charts/HoleGreensPuttsChart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/brand/components/Card";
import { homeCourseHoles } from "@/testing/fixtures/courseHoles";

export default function HoleGreensPuttsChartPreview() {
  return (
    <div data-testid="brand-frame" className="fixed inset-0 overflow-auto bg-background p-6">
      <Card className="py-5">
        <CardHeader className="px-6">
          <CardTitle className="font-semibold">Greens and putts</CardTitle>
          <CardDescription className="text-body-sm">Where a missed green and an extra putt land on the same hole</CardDescription>
        </CardHeader>
        <CardContent className="px-6">
          <HoleGreensPuttsChart holes={homeCourseHoles} />
        </CardContent>
      </Card>
    </div>
  );
}

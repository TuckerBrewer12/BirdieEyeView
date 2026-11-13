import { HoleProfileChart } from "@/brand/charts/HoleProfileChart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/brand/components/Card";
import { homeCourseHoles, homeCourseHolesHardestFirst } from "@/testing/fixtures/courseHoles";

/** A home course hole by hole, in a card at the width the course page gives it, then hardest first. */
export default function HoleProfileChartPreview() {
  return (
    <div data-testid="brand-frame" className="fixed inset-0 flex flex-col gap-6 overflow-auto bg-background p-6">
      <Card className="py-5">
        <CardHeader className="px-6">
          <CardTitle className="font-semibold">Hole by hole</CardTitle>
          <CardDescription className="text-body-sm">Average to par on each hole, and how far it swings</CardDescription>
        </CardHeader>
        <CardContent className="px-6">
          <HoleProfileChart holes={homeCourseHoles} />
        </CardContent>
      </Card>
      <Card className="py-5">
        <CardContent className="px-6">
          <HoleProfileChart holes={homeCourseHolesHardestFirst} ranked />
        </CardContent>
      </Card>
    </div>
  );
}

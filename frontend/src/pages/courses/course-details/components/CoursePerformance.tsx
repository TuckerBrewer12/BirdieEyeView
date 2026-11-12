import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
  HoleGreensPuttsChart,
  HoleProfileChart,
  ToggleGroup,
  ToggleGroupItem,
  TrendAreaChart,
} from "@/brand";
import type { CourseDetailPageViewModel } from "../useCourseDetailPageViewModel";

type CoursePerformanceProps = Pick<
  CourseDetailPageViewModel,
  "scoreTrend" | "averageLine" | "courseHoles" | "holes" | "holeOrder" | "holeOrders" | "pickHoleOrder" | "greens"
>;

/**
 * How the golfer plays a course: their score here over time, then the holes, first by how each one
 * plays (to par, how far it swings, the mix of scores) and then by greens and putts. Every figure is
 * the server's; the charts are the kit's.
 */
export function CoursePerformance({
  scoreTrend,
  averageLine,
  courseHoles,
  holes,
  holeOrder,
  holeOrders,
  pickHoleOrder,
  greens,
}: CoursePerformanceProps) {
  return (
    <div data-slot="course-performance" className="flex flex-col gap-3.5 md:gap-4">
      <Card size="lg">
        <CardHeader>
          <CardTitle level={2} className="text-body-lg font-semibold">
            Score trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TrendAreaChart
            aria-label="Score trend here"
            points={scoreTrend}
            series={[
              { label: "Score", tone: "primary" },
              { label: "5-round avg", tone: "neutral" },
            ]}
            reference={averageLine}
          />
        </CardContent>
      </Card>

      <Card size="lg" data-slot="hole-profile">
        <CardHeader>
          <CardTitle level={2} className="text-body-lg font-semibold">
            Hole by hole, average to par
          </CardTitle>
          <CardAction>
            <ToggleGroup
              size="sm"
              aria-label="Order holes"
              value={[holeOrder]}
              onValueChange={(values: string[]) => pickHoleOrder(values[0])}
            >
              {holeOrders.map((option) => (
                <ToggleGroupItem key={option.value} value={option.value}>
                  {option.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </CardAction>
        </CardHeader>
        <CardContent>
          <HoleProfileChart holes={holes} ranked={holeOrder === "hardest"} />
        </CardContent>
      </Card>

      <Card size="lg" data-slot="greens-putts">
        <CardHeader>
          <CardTitle level={2} className="text-body-lg font-semibold">
            Greens and putts
          </CardTitle>
          <CardAction>
            <div className="flex gap-4 text-body-sm text-foreground-secondary">
              {greens.map((figure) => (
                <span key={figure.label}>
                  {figure.label} <span className="font-semibold text-foreground">{figure.value}</span>
                </span>
              ))}
            </div>
          </CardAction>
        </CardHeader>
        <CardContent>
          <HoleGreensPuttsChart holes={courseHoles} />
        </CardContent>
      </Card>
    </div>
  );
}

import { Card } from "@/brand/components/Card";
import { CoursePreview } from "@/brand/components/CoursePreview";
import { courseSummaryFrom } from "@/domain/course";
import { populatedCourses } from "@/testing/fixtures/courses";

const [halfMoonBay, blueRock, pebbleBeach] = populatedCourses.map(courseSummaryFrom);

/** Compose-style @Preview for CoursePreview: the course list's card, played, played once, and not played. */
export default function CoursePreviewPreview() {
  return (
    <Card className="gap-0 divide-y divide-border py-0">
      <CoursePreview course={halfMoonBay} onClick={() => {}} />
      <CoursePreview course={blueRock} onClick={() => {}} />
      <CoursePreview course={{ ...pebbleBeach, location: null }} onClick={() => {}} />
    </Card>
  );
}

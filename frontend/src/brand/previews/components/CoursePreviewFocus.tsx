import { Card } from "@/brand/components/Card";
import { CoursePreview } from "@/brand/components/CoursePreview";
import { courseSummaryFrom } from "@/domain/course";
import { populatedCourses } from "@/testing/fixtures/courses";

/** Keyboard focus ring on a course row. */
export default function CoursePreviewFocusPreview() {
  return (
    <Card className="py-0">
      <CoursePreview course={courseSummaryFrom(populatedCourses[0])} onClick={() => {}} focused />
    </Card>
  );
}

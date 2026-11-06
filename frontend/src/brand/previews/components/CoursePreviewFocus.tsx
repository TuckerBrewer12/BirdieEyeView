import { CoursePreview } from "@/brand/components/CoursePreview";
import { courseSummaryFrom } from "@/domain/course";
import { populatedCourses } from "@/testing/fixtures/courses";

export default function CoursePreviewFocusPreview() {
  return <CoursePreview course={courseSummaryFrom(populatedCourses[0])} onClick={() => {}} focused />;
}

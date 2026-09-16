import { CoursePreview } from "@/brand/components/CoursePreview";
import { populatedCourses } from "@/testing/fixtures/courses";

/** Keyboard focus ring on a course card. */
export default function CoursePreviewFocusPreview() {
  return <CoursePreview course={populatedCourses[0]} onClick={() => {}} focused />;
}

import { CoursePreview } from "@/brand/components/CoursePreview";
import { populatedCourses } from "@/testing/fixtures/courses";

const [halfMoonBay, blueRock, pebbleBeach] = populatedCourses;

/** Compose-style @Preview for CoursePreview. */
export default function CoursePreviewPreview() {
  return (
    <>
      <CoursePreview course={halfMoonBay} />
      <CoursePreview course={blueRock} />
      <CoursePreview course={{ ...pebbleBeach, location: null }} />
    </>
  );
}

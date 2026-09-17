import { test } from "./CourseDetailPage.robot";
import { populatedCourses } from "../../../../testing/fixtures/courses";
import { halfMoonBayCourse } from "../../../../testing/fixtures/roundDetails";

test("opening a course URL and back returns to the list", async ({ courseDetail }) => {
  await courseDetail.open(halfMoonBayCourse, { courses: populatedCourses });
  await courseDetail.isAtCourse("course-hmb");
  await courseDetail.goBack();
  await courseDetail.isAtCourses();
});

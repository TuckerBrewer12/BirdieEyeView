import { test } from "./CourseDetailPage.robot";
import { populatedCourses } from "../../../../testing/fixtures/courses";
import { halfMoonBayCourse } from "../../../../testing/fixtures/roundDetails";

test("shows the course name", async ({ courseDetail }) => {
  await courseDetail.open(halfMoonBayCourse);
  await courseDetail.seesCourse("Half Moon Bay");
});

test("back returns to the course list", async ({ courseDetail }) => {
  await courseDetail.open(halfMoonBayCourse, { courses: populatedCourses });
  await courseDetail.isAtCourse("course-hmb");
  await courseDetail.goBack();
  await courseDetail.isAtCourses();
});

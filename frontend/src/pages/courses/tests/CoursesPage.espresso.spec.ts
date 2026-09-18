import { test } from "./CoursesPage.robot";
import { populatedCourses } from "../../../testing/fixtures/courses";
import { halfMoonBayCourse } from "../../../testing/fixtures/roundDetails";

test("search keeps matching courses and hides the rest", async ({ courses }) => {
  await courses.open(populatedCourses);
  await courses.search("Blue");
  await courses.seesCourse("Blue Rock");
  await courses.doesNotSeeCourse("Half Moon Bay");
});

test("tapping a course opens its page and back returns to the list", async ({ courses }) => {
  await courses.open(populatedCourses, { fullCourses: [halfMoonBayCourse] });
  await courses.tapCourse("Half Moon Bay");
  await courses.isAtCourse("course-hmb");
  await courses.seesDetail("Half Moon Bay");
  await courses.goBack();
  await courses.seesCourse("Blue Rock");
});

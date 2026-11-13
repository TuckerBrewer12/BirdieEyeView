import { test } from "./CoursesPage.robot";
import { populatedCourses } from "../../../testing/fixtures/courses";
import { halfMoonBayCourse } from "../../../testing/fixtures/roundDetails";
import { storedRounds } from "../../../testing/fixtures/rounds";

test("search keeps matching courses and hides the rest", async ({ courses }) => {
  await courses.open(populatedCourses);
  await courses.search("Blue");
  await courses.seesCourse("Blue Rock");
  await courses.doesNotSeeCourse("Half Moon Bay");
});

test("each course carries the golfer's record there, searched or not", async ({ courses }) => {
  await courses.open(populatedCourses, { rounds: storedRounds });
  await courses.seesRecord("Half Moon Bay", "75.0");
  await courses.seesRecord("Pebble Beach", "Not played");
  await courses.search("Half");
  await courses.seesRecord("Half Moon Bay", "75.0");
});

test("tapping a course opens its page and back returns to the list", async ({ courses }) => {
  await courses.open(populatedCourses, { fullCourses: [halfMoonBayCourse] });
  await courses.tapCourse("Half Moon Bay");
  await courses.isAtCourse("course-hmb");
  await courses.seesDetail("Half Moon Bay");
  await courses.goBack();
  await courses.seesCourse("Blue Rock");
});

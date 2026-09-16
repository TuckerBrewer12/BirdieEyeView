import { test } from "./CoursesPage.robot";
import { populatedCourses } from "../../../testing/fixtures/courses";

test("API test courses do not appear in the list", async ({ courses }) => {
  await courses.open(populatedCourses);
  await courses.seesCourse("Half Moon Bay");
  await courses.doesNotSeeCourse("API Test Course");
});

test("search keeps matching courses and hides the rest", async ({ courses }) => {
  await courses.open(populatedCourses);
  await courses.search("Blue");
  await courses.seesCourse("Blue Rock");
  await courses.doesNotSeeCourse("Half Moon Bay");
});

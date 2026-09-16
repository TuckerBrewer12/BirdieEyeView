import { test } from "./CoursesPage.robot";
import { populatedCourses } from "../../../testing/fixtures/courses";

test("populated list", async ({ courses }) => {
  await courses.open(populatedCourses);
  await courses.seesCourse("Half Moon Bay");
  await courses.capture("courses-populated.png");
});

test("populated list in dark mode", async ({ courses }) => {
  await courses.dark();
  await courses.open(populatedCourses);
  await courses.seesCourse("Half Moon Bay");
  await courses.capture("courses-populated-dark.png");
});

test("empty list", async ({ courses }) => {
  await courses.open([]);
  await courses.seesEmptyState();
  await courses.capture("courses-empty.png");
});

test("load error does not show empty copy", async ({ courses }) => {
  await courses.openFailed();
  await courses.doesNotSeeEmptyState();
  await courses.capture("courses-error.png");
});

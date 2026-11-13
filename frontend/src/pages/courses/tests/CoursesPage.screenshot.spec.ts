import { test } from "./CoursesPage.robot";
import { populatedCourses } from "../../../testing/fixtures/courses";
import { storedRounds } from "../../../testing/fixtures/rounds";

test("populated list", async ({ courses }) => {
  await courses.open(populatedCourses, { rounds: storedRounds });
  await courses.seesRecord("Half Moon Bay", "75.0");
  await courses.capture("courses-populated.png");
});

test("populated list in dark mode", async ({ courses }) => {
  await courses.dark();
  await courses.open(populatedCourses, { rounds: storedRounds });
  await courses.seesRecord("Half Moon Bay", "75.0");
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

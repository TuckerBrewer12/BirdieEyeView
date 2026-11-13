import { test } from "./RoundsPage.robot";
import { searchableCourses } from "../../../testing/fixtures/courses";
import { storedRounds } from "../../../testing/fixtures/rounds";

test("populated list", async ({ rounds }) => {
  await rounds.open(storedRounds);
  await rounds.seesCourse("Half Moon Bay");
  await rounds.capture("rounds-populated.png");
});

test("populated list in dark mode", async ({ rounds }) => {
  await rounds.dark();
  await rounds.open(storedRounds);
  await rounds.seesCourse("Half Moon Bay");
  await rounds.capture("rounds-populated-dark.png");
});

test("empty list", async ({ rounds }) => {
  await rounds.open([]);
  await rounds.seesEmptyState();
  await rounds.capture("rounds-empty.png");
});

test("course link panel open", async ({ rounds }) => {
  await rounds.open(storedRounds);
  await rounds.openLinkFor("Scanned Scorecard");
  await rounds.seesLinkPanel();
  await rounds.capture("rounds-link-open.png");
});

test("course link failed", async ({ rounds }) => {
  await rounds.open(storedRounds, { courses: searchableCourses, linkError: "That course is not available." });
  await rounds.openLinkFor("Scanned Scorecard");
  await rounds.searchCourses("Pebble");
  await rounds.pickCourse("Pebble Beach");
  await rounds.seesLinkError("That course is not available.");
  await rounds.seesLinkPanel();
  await rounds.capture("rounds-link-error.png");
});

test("sort menu open", async ({ rounds }) => {
  await rounds.open(storedRounds);
  await rounds.openSortMenu();
  await rounds.seesSortMenu();
  await rounds.capture("rounds-sort-open.png", { fullPage: false });
});

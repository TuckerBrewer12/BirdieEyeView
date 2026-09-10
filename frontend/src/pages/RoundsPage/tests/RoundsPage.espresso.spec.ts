import { test } from "./RoundsPage.robot";
import { searchableCourses } from "../../../testing/fixtures/courses";
import { nRounds, populatedRounds } from "../../../testing/fixtures/rounds";

test("All chip is pressed by default", async ({ rounds }) => {
  await rounds.open(populatedRounds);
  await rounds.seesChipPressed("All");
});

test("search keeps matching courses and hides the rest", async ({ rounds }) => {
  await rounds.open(populatedRounds);
  await rounds.search("Blue");
  await rounds.seesCourse("Blue Rock");
  await rounds.doesNotSeeCourse("Half Moon Bay");
  await rounds.seesRoundCount(1);
});

test("search with no hits shows the empty state", async ({ rounds }) => {
  await rounds.open(populatedRounds);
  await rounds.search("zzzz");
  await rounds.seesEmptyState();
});

test("course chip filters to that course", async ({ rounds }) => {
  await rounds.open(populatedRounds);
  await rounds.tapChip("Blue Rock");
  await rounds.seesCourse("Blue Rock");
  await rounds.doesNotSeeCourse("Half Moon Bay");
  await rounds.seesRoundCount(1);
});

test("Best chip lists the lowest score first", async ({ rounds }) => {
  await rounds.open(populatedRounds);
  await rounds.tapChip("Best");
  await rounds.seesRoundCount(4);
  await rounds.tapRound("Blue Rock");
  await rounds.isAtRound("round-3");
});

test("sorting by score puts the highest score first", async ({ rounds }) => {
  await rounds.open(populatedRounds);
  await rounds.sortBy("Score");
  await rounds.tapRound("Scanned Scorecard");
  await rounds.isAtRound("round-4");
});

test("tapping a round opens its detail page", async ({ rounds }) => {
  await rounds.open(populatedRounds);
  await rounds.tapRound("Half Moon Bay");
  await rounds.isAtRound("round-1");
});

test("course-link panel opens and closes", async ({ rounds }) => {
  await rounds.open(populatedRounds);
  await rounds.openLinkFor("Scanned Scorecard");
  await rounds.seesLinkPanel("Scanned Scorecard");
  await rounds.closeLink();
  await rounds.doesNotSeeLinkPanel();
});

test("linking a course updates the round and closes the panel", async ({ rounds }) => {
  await rounds.open(populatedRounds, { courses: searchableCourses });
  await rounds.openLinkFor("Scanned Scorecard");
  await rounds.searchCourses("Pebble");
  await rounds.pickCourse("Pebble Beach");
  await rounds.seesCourse("Pebble Beach");
  await rounds.doesNotSeeLinkPanel();
});

test("load more reveals the remaining rounds", async ({ rounds }) => {
  await rounds.open(nRounds(21));
  await rounds.doesNotSeeCourse("Course 1");
  await rounds.loadMore();
  await rounds.seesCourse("Course 1");
});

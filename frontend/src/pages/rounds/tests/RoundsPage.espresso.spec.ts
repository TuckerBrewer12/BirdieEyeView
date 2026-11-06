import { test } from "./RoundsPage.robot";
import { searchableCourses } from "../../../testing/fixtures/courses";
import type { StoredRound } from "../../../testing/fakes/roundResponses";
import { nRounds, storedRounds } from "../../../testing/fixtures/rounds";

test("All chip is pressed by default", async ({ rounds }) => {
  await rounds.open(storedRounds);
  await rounds.seesChipPressed("All");
});

test("search keeps matching courses and hides the rest", async ({ rounds }) => {
  await rounds.open(storedRounds);
  await rounds.search("Blue");
  await rounds.seesCourse("Blue Rock");
  await rounds.doesNotSeeCourse("Half Moon Bay");
  await rounds.seesRoundCount(1);
});

test("search with no hits shows the empty state", async ({ rounds }) => {
  await rounds.open(storedRounds);
  await rounds.search("zzzz");
  await rounds.seesEmptyState();
});

test("course chip filters to that course", async ({ rounds }) => {
  await rounds.open(storedRounds);
  await rounds.tapChip("Blue Rock");
  await rounds.seesCourse("Blue Rock");
  await rounds.doesNotSeeCourse("Half Moon Bay");
  await rounds.seesRoundCount(1);
});

test("Best chip lists the best round first", async ({ rounds }) => {
  await rounds.open(storedRounds);
  await rounds.tapChip("Best");
  await rounds.seesRoundCount(4);
  await rounds.seesFirstRound("Blue Rock");
  await rounds.tapRound("Blue Rock");
  await rounds.isAtRound("round-3");
});

test("Best chip ranks a full round ahead of a nine with a lower score", async ({ rounds }) => {
  const [, , blueRock] = storedRounds;
  const nine: StoredRound = {
    ...blueRock,
    id: "round-nine",
    course: null,
    course_name_played: "Twilight Nine",
    hole_scores: blueRock.hole_scores.slice(0, 9),
  };
  await rounds.open([nine, ...storedRounds]);
  await rounds.tapChip("Best");
  await rounds.seesFirstRound("Blue Rock");
});

test("sorting by score puts the highest score first", async ({ rounds }) => {
  await rounds.open(storedRounds);
  await rounds.sortBy("Score");
  await rounds.tapRound("Scanned Scorecard");
  await rounds.isAtRound("round-4");
});

test("tapping a round opens its detail page", async ({ rounds }) => {
  await rounds.open(storedRounds);
  await rounds.tapRound("Half Moon Bay");
  await rounds.isAtRound("round-1");
});

test("course-link panel opens and closes", async ({ rounds }) => {
  await rounds.open(storedRounds);
  await rounds.openLinkFor("Scanned Scorecard");
  await rounds.seesLinkPanel("Scanned Scorecard");
  await rounds.closeLink();
  await rounds.doesNotSeeLinkPanel();
});

test("linking a course updates the round and closes the panel", async ({ rounds }) => {
  await rounds.open(storedRounds, { courses: searchableCourses });
  await rounds.openLinkFor("Scanned Scorecard");
  await rounds.searchCourses("Pebble");
  await rounds.pickCourse("Pebble Beach");
  await rounds.seesCourse("Pebble Beach");
  await rounds.doesNotSeeLinkPanel();
});

test("a failed link says why and keeps the panel open", async ({ rounds }) => {
  await rounds.open(storedRounds, { courses: searchableCourses, linkError: "That course is not available." });
  await rounds.openLinkFor("Scanned Scorecard");
  await rounds.searchCourses("Pebble");
  await rounds.pickCourse("Pebble Beach");
  await rounds.seesLinkError("That course is not available.");
  await rounds.seesLinkPanel("Scanned Scorecard");
});

test("load more reveals the remaining rounds", async ({ rounds }) => {
  await rounds.open(nRounds(21));
  await rounds.doesNotSeeCourse("Course 1");
  await rounds.loadMore();
  await rounds.seesCourse("Course 1");
});

test("a one-character course query clears the results instead of searching", async ({ rounds }) => {
  await rounds.open(storedRounds, { courses: searchableCourses });
  await rounds.openLinkFor("Scanned Scorecard");
  await rounds.searchCourses("Pe");
  await rounds.seesCourseResult("Pebble Beach");

  // "P" matches Pebble Beach too, so a search for it would keep the result on screen.
  await rounds.searchCourses("P");
  await rounds.doesNotSeeCourseResults();
  await rounds.doesNotSeeNoCoursesFound();
});

test("a course search with no hits says so", async ({ rounds }) => {
  await rounds.open(storedRounds, { courses: searchableCourses });
  await rounds.openLinkFor("Scanned Scorecard");
  await rounds.searchCourses("zzzz");
  await rounds.seesNoCoursesFound();
});

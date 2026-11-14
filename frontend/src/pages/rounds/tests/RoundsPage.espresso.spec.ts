import { test } from "./RoundsPage.robot";
import { searchableCourses } from "../../../testing/fixtures/courses";
import type { StoredRound } from "../../../testing/fakes/roundResponses";
import { nRounds, storedRounds } from "../../../testing/fixtures/rounds";

test("All is the scope by default", async ({ rounds }) => {
  await rounds.open(storedRounds);
  await rounds.seesScopePressed("All");
  await rounds.seesRoundCount(4);
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

test("a failed load says so, and Retry lists the rounds", async ({ rounds }) => {
  await rounds.openFailing(storedRounds);
  await rounds.seesLoadError();
  rounds.listingRecovers();
  await rounds.retry();
  await rounds.seesCourse("Half Moon Bay");
});

test("the course menu filters to that course", async ({ rounds }) => {
  await rounds.open(storedRounds);
  await rounds.filterByCourse("Blue Rock");
  await rounds.seesCourse("Blue Rock");
  await rounds.doesNotSeeCourse("Half Moon Bay");
  await rounds.seesRoundCount(1);
});

test("the Best scope lists the best round first", async ({ rounds }) => {
  await rounds.open(storedRounds);
  await rounds.tapScope("Best");
  await rounds.seesRoundCount(4);
  await rounds.seesFirstRound("Blue Rock");
  await rounds.tapRound("Blue Rock");
  await rounds.isAtRound("round-3");
});

test("the Best scope ranks a full round ahead of a nine with a lower score", async ({ rounds }) => {
  const [, , blueRock] = storedRounds;
  const nine: StoredRound = {
    ...blueRock,
    id: "round-nine",
    course: null,
    course_name_played: "Twilight Nine",
    hole_scores: blueRock.hole_scores.slice(0, 9),
  };
  await rounds.open([nine, ...storedRounds]);
  await rounds.tapScope("Best");
  await rounds.seesFirstRound("Blue Rock");
});

test("Worst score puts the worst round first", async ({ rounds }) => {
  await rounds.open(storedRounds);
  await rounds.sortBy("Worst score");
  await rounds.seesFirstRound("Scanned Scorecard");
  await rounds.tapRound("Scanned Scorecard");
  await rounds.isAtRound("round-4");
});

test("Oldest puts the first round played first", async ({ rounds }) => {
  await rounds.open(storedRounds);
  await rounds.sortBy("Oldest");
  await rounds.seesFirstRound("Scanned Scorecard");
});

test("picking a sort leaves the Best scope", async ({ rounds }) => {
  await rounds.open(storedRounds);
  await rounds.tapScope("Best");
  await rounds.sortBy("Newest");
  await rounds.seesScopePressed("All");
  await rounds.seesFirstRound("Half Moon Bay");
});

test("tapping a round opens its detail page", async ({ rounds }) => {
  await rounds.open(storedRounds);
  await rounds.tapRound("Half Moon Bay");
  await rounds.isAtRound("round-1");
});

test("course-link panel opens and closes", async ({ rounds }) => {
  await rounds.open(storedRounds);
  await rounds.openLinkFor("Scanned Scorecard");
  await rounds.seesLinkPanel();
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
  await rounds.seesLinkPanel();
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

test.describe("on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test("the search opens from the title row", async ({ rounds }) => {
    await rounds.open(storedRounds);
    await rounds.openSearch();
    await rounds.search("Blue");
    await rounds.seesCourse("Blue Rock");
    await rounds.seesRoundCount(1);
  });

  test("the sort sheet opens from the title row's icon", async ({ rounds }) => {
    await rounds.open(storedRounds);
    await rounds.sortBy("Worst score");
    await rounds.seesFirstRound("Scanned Scorecard");
  });

  test("the course sheet filters to that course", async ({ rounds }) => {
    await rounds.open(storedRounds);
    await rounds.filterByCourse("Blue Rock");
    await rounds.seesRoundCount(1);
  });

  test("Link opens a sheet that names the round, and keeping the name closes it", async ({ rounds }) => {
    await rounds.open(storedRounds, { courses: searchableCourses });
    await rounds.openLinkFor("Scanned Scorecard");
    await rounds.seesLinkSheet(/^Scanned Scorecard · \w{3} \d{1,2} · 85$/);
    await rounds.keepName("Scanned Scorecard");
    await rounds.doesNotSeeLinkPanel();
  });

  test("linking from the sheet updates the round", async ({ rounds }) => {
    await rounds.open(storedRounds, { courses: searchableCourses });
    await rounds.openLinkFor("Scanned Scorecard");
    await rounds.searchCourses("Pebble");
    await rounds.pickCourse("Pebble Beach");
    await rounds.seesCourse("Pebble Beach");
    await rounds.doesNotSeeLinkPanel();
  });
});

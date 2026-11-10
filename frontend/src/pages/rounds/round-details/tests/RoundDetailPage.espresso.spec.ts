import { test } from "./RoundDetailPage.robot";
import { searchableCourses } from "../../../../testing/fixtures/courses";
import {
  halfMoonBayCourse,
  halfMoonBayRound,
  pebbleBeachCourse,
  ratedHalfMoonBayCourse,
  ratedHalfMoonBayRound,
  roundComparison,
  firstRoundComparison,
  scannedRound,
} from "../../../../testing/fixtures/roundDetails";
import { storedRounds } from "../../../../testing/fixtures/rounds";

test("shows the course name and score", async ({ roundDetail }) => {
  await roundDetail.open(halfMoonBayRound, { fullCourses: [halfMoonBayCourse] });
  await roundDetail.seesCourse("Half Moon Bay");
});

test("shows the net score the server works out off the golfer's index", async ({ roundDetail }) => {
  await roundDetail.open(ratedHalfMoonBayRound, { fullCourses: [ratedHalfMoonBayCourse] });
  await roundDetail.seesScore(78);
  await roundDetail.seesNet(66, 12);
});

test("a hole cleared in edit mode takes the net score away until it is saved", async ({ roundDetail }) => {
  await roundDetail.open(ratedHalfMoonBayRound, { fullCourses: [ratedHalfMoonBayCourse] });
  await roundDetail.seesNet(66, 12);
  await roundDetail.tapEdit();
  await roundDetail.clearStrokes(1);
  await roundDetail.seesNoNet();
});

test("edit then cancel returns to the view actions", async ({ roundDetail }) => {
  await roundDetail.open(halfMoonBayRound, { fullCourses: [halfMoonBayCourse] });
  await roundDetail.tapEdit();
  await roundDetail.tapCancelEdit();
  await roundDetail.seesViewActions();
});

test("a hole's score typed in edit mode is kept after saving", async ({ roundDetail }) => {
  await roundDetail.open(halfMoonBayRound, { fullCourses: [halfMoonBayCourse] });
  await roundDetail.seesScore(78);
  await roundDetail.tapEdit();
  await roundDetail.typeStrokes(1, 7);
  await roundDetail.tapSave();
  await roundDetail.seesScore(80);
});

test("a hole's score cleared in edit mode stays cleared after saving", async ({ roundDetail }) => {
  await roundDetail.open(halfMoonBayRound, { fullCourses: [halfMoonBayCourse] });
  await roundDetail.seesScore(78);
  await roundDetail.tapEdit();
  await roundDetail.clearStrokes(1);
  await roundDetail.tapSave();
  await roundDetail.seesScore(73);
});

test("a tee picked in edit mode is kept after saving", async ({ roundDetail }) => {
  await roundDetail.open(halfMoonBayRound, { fullCourses: [halfMoonBayCourse] });
  await roundDetail.seesTee("Blue");
  await roundDetail.tapEdit();
  await roundDetail.tapTee("White");
  await roundDetail.tapSave();
  await roundDetail.seesTee("White");
});

test("a tee typed on a round with no course tees is kept after saving", async ({ roundDetail }) => {
  await roundDetail.open(scannedRound);
  await roundDetail.tapEdit();
  await roundDetail.typeTee("White");
  await roundDetail.tapSave();
  await roundDetail.seesTee("White");
});

test("delete confirm then cancel leaves the round", async ({ roundDetail }) => {
  await roundDetail.open(halfMoonBayRound, { fullCourses: [halfMoonBayCourse] });
  await roundDetail.tapDelete();
  await roundDetail.seesDeleteConfirm();
  await roundDetail.cancelDelete();
  await roundDetail.seesCourse("Half Moon Bay");
});

test("delete confirm then yes returns to the list", async ({ roundDetail }) => {
  await roundDetail.open(halfMoonBayRound, {
    rounds: storedRounds,
    fullCourses: [halfMoonBayCourse],
  });
  await roundDetail.tapDelete();
  await roundDetail.seesDeleteConfirm();
  await roundDetail.confirmDelete();
  await roundDetail.isAtRounds();
});

test("course-link panel opens", async ({ roundDetail }) => {
  await roundDetail.open(scannedRound);
  await roundDetail.tapLinkCourse();
  await roundDetail.seesLinkPanel();
});

test("linking a course updates the round and hides the link button", async ({ roundDetail }) => {
  await roundDetail.open(scannedRound, {
    courses: searchableCourses,
    fullCourses: [pebbleBeachCourse],
  });
  await roundDetail.tapLinkCourse();
  await roundDetail.searchCourses("Pebble");
  await roundDetail.pickCourse("Pebble Beach");
  await roundDetail.seesCourse("Pebble Beach");
  await roundDetail.doesNotSeeLinkCourse();
});

test("a failed link says why and keeps the panel open", async ({ roundDetail }) => {
  await roundDetail.open(scannedRound, {
    courses: searchableCourses,
    fullCourses: [pebbleBeachCourse],
    linkError: "That course is not available.",
  });
  await roundDetail.tapLinkCourse();
  await roundDetail.searchCourses("Pebble");
  await roundDetail.pickCourse("Pebble Beach");
  await roundDetail.seesLinkError("That course is not available.");
  await roundDetail.seesLinkPanel();
  await roundDetail.seesCourse("Scanned Scorecard");
});

test("saving an unmatched name keeps the round on that custom name", async ({ roundDetail }) => {
  await roundDetail.open(scannedRound, { courses: searchableCourses });
  await roundDetail.tapEdit();
  await roundDetail.tapEditCourseName();
  await roundDetail.searchCourses("Torrey Pines");
  await roundDetail.saveAsCustomName("Torrey Pines");
  await roundDetail.seesCustomNameCard("Torrey Pines");
});

test("changing course on a linked round returns to the search field", async ({ roundDetail }) => {
  await roundDetail.open(halfMoonBayRound, { fullCourses: [halfMoonBayCourse] });
  await roundDetail.tapEdit();
  await roundDetail.seesLinkedCard("Half Moon Bay");
  await roundDetail.tapChangeCourse();
  await roundDetail.seesCourseSearchField();
});

test("editing the name on a custom-named round returns to the search field", async ({
  roundDetail,
}) => {
  await roundDetail.open(scannedRound);
  await roundDetail.tapEdit();
  await roundDetail.seesCustomNameCard("Scanned Scorecard");
  await roundDetail.tapEditCourseName();
  await roundDetail.seesCourseSearchField();
});

test("keeping the played name goes back to the custom-name card", async ({ roundDetail }) => {
  await roundDetail.open(scannedRound);
  await roundDetail.tapEdit();
  await roundDetail.tapEditCourseName();
  await roundDetail.tapKeepPlayedName("Scanned Scorecard");
  await roundDetail.seesCustomNameCard("Scanned Scorecard");
});

test("vs your average opens on the last 20 and switches window", async ({ roundDetail }) => {
  await roundDetail.open(halfMoonBayRound, { fullCourses: [halfMoonBayCourse], comparison: roundComparison });
  await roundDetail.seesComparison("L20", { label: "Score", average: "80.4", difference: "\u22122.4" });
  await roundDetail.tapComparisonWindow("L5");
  await roundDetail.seesComparison("L5", { label: "Score", average: "81.4", difference: "\u22123.4" });
});

test("a first round has no average to compare with", async ({ roundDetail }) => {
  await roundDetail.open(halfMoonBayRound, { fullCourses: [halfMoonBayCourse], comparison: firstRoundComparison });
  await roundDetail.seesNoComparisonYet();
});

test.describe("on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test("delete asks to confirm and returns to the list", async ({ roundDetail }) => {
    await roundDetail.open(halfMoonBayRound, {
      fullCourses: [halfMoonBayCourse],
      rounds: storedRounds,
    });
    await roundDetail.tapDelete();
    await roundDetail.seesDeleteConfirm();
    await roundDetail.confirmDelete();
    await roundDetail.isAtRounds();
  });

  test("a score typed on the phone's front nine is kept after saving", async ({ roundDetail }) => {
    await roundDetail.open(halfMoonBayRound, { fullCourses: [halfMoonBayCourse] });
    await roundDetail.tapEdit();
    await roundDetail.typeStrokes(1, 7);
    await roundDetail.tapSave();
    await roundDetail.seesScore(80);
  });
});

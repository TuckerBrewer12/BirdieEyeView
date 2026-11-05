import { test } from "./RoundDetailPage.robot";
import { searchableCourses } from "../../../../testing/fixtures/courses";
import {
  halfMoonBayCourse,
  halfMoonBayRound,
  pebbleBeachCourse,
  ratedHalfMoonBayCourse,
  ratedHalfMoonBayRound,
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

test("shows the net Stableford points off the golfer's course handicap", async ({ roundDetail }) => {
  await roundDetail.open(ratedHalfMoonBayRound, { fullCourses: [ratedHalfMoonBayCourse] });
  // 78 off 12 is net 66, six under: 42 points.
  await roundDetail.seesStableford(42);
});

test("a round with no course handicap shows no Stableford points", async ({ roundDetail }) => {
  await roundDetail.open(halfMoonBayRound, { fullCourses: [halfMoonBayCourse] });
  await roundDetail.seesScore(78);
  await roundDetail.seesNoStableford();
});

test("a score typed in edit mode moves the Stableford points with it", async ({ roundDetail }) => {
  await roundDetail.open(ratedHalfMoonBayRound, { fullCourses: [ratedHalfMoonBayCourse] });
  await roundDetail.tapEdit();
  // The first is stroke index 1: a 6 there is a net bogey, one point fewer than the net par.
  await roundDetail.typeStrokes(1, 6);
  await roundDetail.seesStableford(41);
  await roundDetail.clearStrokes(1);
  await roundDetail.seesNoStableford();
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

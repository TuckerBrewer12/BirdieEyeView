import { test } from "./RoundDetailPage.robot";
import { searchableCourses } from "../../../../testing/fixtures/courses";
import {
  halfMoonBayCourse,
  halfMoonBayRound,
  pebbleBeachCourse,
  scannedRound,
} from "../../../../testing/fixtures/roundDetails";
import { populatedRounds } from "../../../../testing/fixtures/rounds";

test("shows the course name and score", async ({ roundDetail }) => {
  await roundDetail.open(halfMoonBayRound, { fullCourses: [halfMoonBayCourse] });
  await roundDetail.seesCourse("Half Moon Bay");
});

test("edit then cancel returns to the view actions", async ({ roundDetail }) => {
  await roundDetail.open(halfMoonBayRound, { fullCourses: [halfMoonBayCourse] });
  await roundDetail.tapEdit();
  await roundDetail.tapCancelEdit();
});

test("delete confirm then cancel leaves the round", async ({ roundDetail }) => {
  await roundDetail.open(halfMoonBayRound, { fullCourses: [halfMoonBayCourse] });
  await roundDetail.tapDelete();
  await roundDetail.cancelDelete();
  await roundDetail.seesCourse("Half Moon Bay");
});

test("delete confirm then yes returns to the list", async ({ roundDetail }) => {
  await roundDetail.open(halfMoonBayRound, {
    rounds: populatedRounds,
    fullCourses: [halfMoonBayCourse],
  });
  await roundDetail.tapDelete();
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

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

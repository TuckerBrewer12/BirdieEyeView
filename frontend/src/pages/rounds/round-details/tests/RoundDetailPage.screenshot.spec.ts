import { test } from "./RoundDetailPage.robot";
import { searchableCourses } from "../../../../testing/fixtures/courses";
import {
  halfMoonBayCourse,
  halfMoonBayRound,
  pebbleBeachCourse,
  scannedRound,
} from "../../../../testing/fixtures/roundDetails";

test("populated round", async ({ roundDetail }) => {
  await roundDetail.open(halfMoonBayRound, {
    fullCourses: [halfMoonBayCourse],
    handicapIndex: 10.4,
  });
  await roundDetail.seesCourse("Half Moon Bay");
  await roundDetail.capture("round-detail-populated.png");
});

test("populated round in dark mode", async ({ roundDetail }) => {
  await roundDetail.dark();
  await roundDetail.open(halfMoonBayRound, {
    fullCourses: [halfMoonBayCourse],
    handicapIndex: 10.4,
  });
  await roundDetail.seesCourse("Half Moon Bay");
  await roundDetail.capture("round-detail-populated-dark.png");
});

test("unlinked round", async ({ roundDetail }) => {
  await roundDetail.open(scannedRound);
  await roundDetail.capture("round-detail-unlinked.png");
});

test("course link panel open", async ({ roundDetail }) => {
  await roundDetail.open(scannedRound, { courses: searchableCourses, fullCourses: [pebbleBeachCourse] });
  await roundDetail.tapLinkCourse();
  await roundDetail.seesLinkPanel();
  await roundDetail.capture("round-detail-link-open.png");
});

test("edit mode", async ({ roundDetail }) => {
  await roundDetail.open(halfMoonBayRound, { fullCourses: [halfMoonBayCourse] });
  await roundDetail.tapEdit();
  await roundDetail.capture("round-detail-edit.png");
});

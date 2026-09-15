import { test } from "./RoundDetailPage.robot";
import { searchableCourses } from "../../../../testing/fixtures/courses";
import {
  halfMoonBayCourse,
  halfMoonBayRound,
  pebbleBeachCourse,
  roundComparison,
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

test("delete confirmation", async ({ roundDetail }) => {
  await roundDetail.open(halfMoonBayRound, { fullCourses: [halfMoonBayCourse] });
  await roundDetail.tapDelete();
  await roundDetail.capture("round-detail-delete-confirm.png");
});

test("comparison charts", async ({ roundDetail }) => {
  await roundDetail.open(halfMoonBayRound, {
    fullCourses: [halfMoonBayCourse],
    comparison: roundComparison,
  });
  await roundDetail.seesCourse("Half Moon Bay");
  await roundDetail.seesComparison();
  await roundDetail.capture("round-detail-comparison.png");
});

test("edit mode", async ({ roundDetail }) => {
  await roundDetail.open(halfMoonBayRound, { fullCourses: [halfMoonBayCourse] });
  await roundDetail.tapEdit();
  await roundDetail.capture("round-detail-edit.png");
});


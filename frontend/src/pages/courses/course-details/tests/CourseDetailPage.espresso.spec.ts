import { test } from "./CourseDetailPage.robot";
import { populatedCourses } from "../../../../testing/fixtures/courses";
import { halfMoonBayAnalytics } from "../../../../testing/fixtures/courseAnalytics";
import { halfMoonBayCourse } from "../../../../testing/fixtures/roundDetails";
import { storedRounds } from "../../../../testing/fixtures/rounds";

test("opening a course URL and back returns to the list", async ({ courseDetail }) => {
  await courseDetail.open(halfMoonBayCourse, { courses: populatedCourses });
  await courseDetail.isAtCourse("course-hmb");
  await courseDetail.goBack();
  await courseDetail.isAtCourses();
});

test("the scorecard reads off the longest tee until another is picked", async ({ courseDetail }) => {
  await courseDetail.open(halfMoonBayCourse);
  await courseDetail.seesSelectedTee("Blue");
  await courseDetail.seesTeeLine("Blue tees · 6,500 yds · 72.4 / 130");
  await courseDetail.tapTee("White");
  await courseDetail.seesSelectedTee("White");
  await courseDetail.seesTeeLine("White tees · 6,100 yds · 70.1 / 122");
});

test("a course played shows the golfer's average row and record", async ({ courseDetail }) => {
  await courseDetail.open(halfMoonBayCourse, { courseAnalytics: halfMoonBayAnalytics });
  await courseDetail.seesAverageRow();
  await courseDetail.seesRecord("75.0");
});

test("a course not played offers to scan a round", async ({ courseDetail }) => {
  await courseDetail.open(halfMoonBayCourse);
  await courseDetail.seesNotPlayed();
  await courseDetail.tapScanARound();
  await courseDetail.isAtScan();
});

test("tapping a recent round opens its detail", async ({ courseDetail }) => {
  await courseDetail.open(halfMoonBayCourse, {
    courseAnalytics: halfMoonBayAnalytics,
    rounds: storedRounds,
  });
  await courseDetail.tapRecentRound("Jun 15, 2026");
  await courseDetail.isAtRound("round-1");
});

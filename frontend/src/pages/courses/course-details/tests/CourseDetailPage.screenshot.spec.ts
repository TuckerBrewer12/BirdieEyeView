import { test } from "./CourseDetailPage.robot";
import { halfMoonBayAnalytics, halfMoonBayFiveRoundsAnalytics } from "../../../../testing/fixtures/courseAnalytics";
import { halfMoonBayCourse, ratedHalfMoonBayCourse } from "../../../../testing/fixtures/roundDetails";

test("a course not played yet, with the golfer's course handicap off the tee", async ({ courseDetail }) => {
  await courseDetail.open(ratedHalfMoonBayCourse);
  await courseDetail.seesNotPlayed();
  await courseDetail.capture("course-detail-populated.png");
});

test("a course not played yet in dark mode", async ({ courseDetail }) => {
  await courseDetail.dark();
  await courseDetail.open(ratedHalfMoonBayCourse);
  await courseDetail.seesNotPlayed();
  await courseDetail.capture("course-detail-populated-dark.png");
});

test("a record that didn't load: an error with Retry in place of the prompt to scan", async ({ courseDetail }) => {
  await courseDetail.open(halfMoonBayCourse, {
    courseAnalytics: halfMoonBayAnalytics,
    courseAnalyticsError: "Stats are down.",
  });
  await courseDetail.seesRecordError();
  await courseDetail.capture("course-detail-record-failed.png");
});

test("a course played: the golfer's rows, record and recent rounds", async ({ courseDetail }) => {
  await courseDetail.open(halfMoonBayCourse, { courseAnalytics: halfMoonBayAnalytics });
  await courseDetail.seesAverageRow();
  await courseDetail.seesRecord("75.0");
  await courseDetail.capture("course-detail-played.png");
});

test("a course played in dark mode", async ({ courseDetail }) => {
  await courseDetail.dark();
  await courseDetail.open(halfMoonBayCourse, { courseAnalytics: halfMoonBayAnalytics });
  await courseDetail.seesRecord("75.0");
  await courseDetail.capture("course-detail-played-dark.png");
});

test("a course played five times: the record stays together beside a longer list of rounds", async ({ courseDetail }) => {
  await courseDetail.open(halfMoonBayCourse, { courseAnalytics: halfMoonBayFiveRoundsAnalytics });
  await courseDetail.seesRecord("75.6");
  await courseDetail.capture("course-detail-played-five-rounds.png");
});

test("a course played: my performance", async ({ courseDetail }) => {
  await courseDetail.open(halfMoonBayCourse, { courseAnalytics: halfMoonBayAnalytics });
  await courseDetail.tapView("My performance");
  await courseDetail.seesPerformance();
  await courseDetail.capture("course-detail-performance.png");
});

test("a course played: my performance in dark mode", async ({ courseDetail }) => {
  await courseDetail.dark();
  await courseDetail.open(halfMoonBayCourse, { courseAnalytics: halfMoonBayAnalytics });
  await courseDetail.tapView("My performance");
  await courseDetail.seesPerformance();
  await courseDetail.capture("course-detail-performance-dark.png");
});

test("missing course", async ({ courseDetail }) => {
  await courseDetail.openMissing();
  await courseDetail.seesNotFound();
  await courseDetail.capture("course-detail-missing.png");
});

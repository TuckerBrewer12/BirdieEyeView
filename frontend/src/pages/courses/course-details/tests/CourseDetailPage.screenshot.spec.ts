import { test } from "./CourseDetailPage.robot";
import { halfMoonBayAnalytics } from "../../../../testing/fixtures/courseAnalytics";
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

test("missing course", async ({ courseDetail }) => {
  await courseDetail.openMissing();
  await courseDetail.seesNotFound();
  await courseDetail.capture("course-detail-missing.png");
});

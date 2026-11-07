import { test } from "./CourseDetailPage.robot";
import { halfMoonBayAnalytics } from "../../../../testing/fixtures/courseAnalytics";
import { halfMoonBayCourse, ratedHalfMoonBayCourse } from "../../../../testing/fixtures/roundDetails";

test("populated course, with the golfer's course handicap on each tee", async ({ courseDetail }) => {
  await courseDetail.open(ratedHalfMoonBayCourse);
  await courseDetail.seesCourse("Half Moon Bay");
  await courseDetail.capture("course-detail-populated.png");
});

test("populated course in dark mode", async ({ courseDetail }) => {
  await courseDetail.dark();
  await courseDetail.open(ratedHalfMoonBayCourse);
  await courseDetail.seesCourse("Half Moon Bay");
  await courseDetail.capture("course-detail-populated-dark.png");
});

test("performance tab", async ({ courseDetail }) => {
  await courseDetail.open(halfMoonBayCourse, { courseAnalytics: halfMoonBayAnalytics });
  await courseDetail.tapPerformance();
  await courseDetail.seesPerformance();
  await courseDetail.capture("course-detail-performance.png");
});

test("performance tab when the golfer's rounds here fail to load", async ({ courseDetail }) => {
  await courseDetail.open(halfMoonBayCourse, { courseAnalyticsError: "Could not load your rounds at this course." });
  await courseDetail.tapPerformance();
  await courseDetail.seesPerformanceError();
  await courseDetail.doesNotSeeNoRounds();
  await courseDetail.capture("course-detail-performance-error.png");
});

test("missing course", async ({ courseDetail }) => {
  await courseDetail.openMissing();
  await courseDetail.seesNotFound();
  await courseDetail.capture("course-detail-missing.png");
});

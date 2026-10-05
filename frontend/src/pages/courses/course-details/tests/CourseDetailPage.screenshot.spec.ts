import { test } from "./CourseDetailPage.robot";
import { halfMoonBayAnalytics } from "../../../../testing/fixtures/courseAnalytics";
import { halfMoonBayCourse } from "../../../../testing/fixtures/roundDetails";

test("populated course", async ({ courseDetail }) => {
  await courseDetail.open(halfMoonBayCourse);
  await courseDetail.seesCourse("Half Moon Bay");
  await courseDetail.capture("course-detail-populated.png");
});

test("populated course in dark mode", async ({ courseDetail }) => {
  await courseDetail.dark();
  await courseDetail.open(halfMoonBayCourse);
  await courseDetail.seesCourse("Half Moon Bay");
  await courseDetail.capture("course-detail-populated-dark.png");
});

test("performance tab", async ({ courseDetail }) => {
  await courseDetail.open(halfMoonBayCourse, { courseAnalytics: halfMoonBayAnalytics });
  await courseDetail.tapPerformance();
  await courseDetail.seesPerformance();
  await courseDetail.capture("course-detail-performance.png");
});

test("missing course", async ({ courseDetail }) => {
  await courseDetail.openMissing();
  await courseDetail.capture("course-detail-missing.png");
});

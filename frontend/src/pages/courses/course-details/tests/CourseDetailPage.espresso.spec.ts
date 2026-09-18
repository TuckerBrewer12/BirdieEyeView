import { test } from "./CourseDetailPage.robot";
import { populatedCourses } from "../../../../testing/fixtures/courses";
import { halfMoonBayAnalytics } from "../../../../testing/fixtures/courseAnalytics";
import { halfMoonBayCourse } from "../../../../testing/fixtures/roundDetails";
import { populatedRounds } from "../../../../testing/fixtures/rounds";

test("opening a course URL and back returns to the list", async ({ courseDetail }) => {
  await courseDetail.open(halfMoonBayCourse, { courses: populatedCourses });
  await courseDetail.isAtCourse("course-hmb");
  await courseDetail.goBack();
  await courseDetail.isAtCourses();
});

test("tapping a tee selects it", async ({ courseDetail }) => {
  await courseDetail.open(halfMoonBayCourse);
  await courseDetail.seesSelectedTee("Blue");
  await courseDetail.tapTee("White");
  await courseDetail.seesSelectedTee("White");
});

test("tapping performance shows hero stats", async ({ courseDetail }) => {
  await courseDetail.open(halfMoonBayCourse, { courseAnalytics: halfMoonBayAnalytics });
  await courseDetail.tapPerformance();
  await courseDetail.seesPerformance();
});

test("tapping a history round opens its detail", async ({ courseDetail }) => {
  await courseDetail.open(halfMoonBayCourse, {
    courseAnalytics: halfMoonBayAnalytics,
    rounds: populatedRounds,
  });
  await courseDetail.tapPerformance();
  await courseDetail.tapHistoryRound("Aug 1, 2026");
  await courseDetail.isAtRound("round-4");
});

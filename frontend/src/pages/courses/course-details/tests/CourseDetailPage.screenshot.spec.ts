import { test } from "./CourseDetailPage.robot";
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

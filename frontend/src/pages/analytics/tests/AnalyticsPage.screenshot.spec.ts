import { LINKS, UNSEEDED_COURSE, test } from "./AnalyticsPage.robot";

test("populated analytics", async ({ analytics }) => {
  await analytics.open();
  await analytics.capture("analytics-populated.png");
});

test("populated analytics in dark mode", async ({ analytics }) => {
  await analytics.dark();
  await analytics.open();
  await analytics.capture("analytics-populated-dark.png");
});

test("filtered to one course", async ({ analytics }) => {
  await analytics.open();
  await analytics.pickCourse(LINKS);
  await analytics.seesRounds(4);
  await analytics.capture("analytics-course.png");
});

test("no rounds match the filters", async ({ analytics }) => {
  await analytics.open();
  await analytics.pickCourse(UNSEEDED_COURSE);
  await analytics.seesNoMatchingRounds();
  await analytics.capture("analytics-no-matching-rounds.png");
});

test("no rounds yet", async ({ analytics }) => {
  await analytics.openWithoutRounds();
  await analytics.capture("analytics-no-rounds.png");
});

test("load failed", async ({ analytics }) => {
  await analytics.openFailed();
  await analytics.seesLoadError();
  await analytics.capture("analytics-load-failed.png");
});

test("phone putting section", async ({ analytics, isMobile }) => {
  test.skip(!isMobile, "The sections are tabs on the phone only.");
  await analytics.open();
  await analytics.openTab("Putting");
  await analytics.seesTabOpen("Putting", "Total Putts per Round");
  await analytics.capture("analytics-putting.png");
});

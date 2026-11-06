import { LINKS, UNSEEDED_COURSE, test } from "./AnalyticsPage.robot";

test("populated analytics", async ({ analytics }) => {
  await analytics.open();
  await analytics.seesRounds(24);
  await analytics.capture("analytics-populated.png");
});

test("populated analytics in dark mode", async ({ analytics }) => {
  await analytics.dark();
  await analytics.open();
  await analytics.seesRounds(24);
  await analytics.capture("analytics-populated-dark.png");
});

test("filtered to one course", async ({ analytics }) => {
  await analytics.open();
  await analytics.pickCourse(LINKS);
  await analytics.seesRounds(4);
  await analytics.capture("analytics-course.png");
});

test("course menu open", async ({ analytics }) => {
  await analytics.open();
  await analytics.openCourseMenu();
  await analytics.seesCourseMenu();
  await analytics.capture("analytics-course-menu.png");
});

test("no rounds match the filters", async ({ analytics }) => {
  await analytics.open();
  await analytics.pickCourse(UNSEEDED_COURSE);
  await analytics.seesNoMatchingRounds();
  await analytics.capture("analytics-no-matching-rounds.png");
});

test("no rounds yet", async ({ analytics }) => {
  await analytics.openWithoutRounds();
  await analytics.seesNoRoundsYet();
  await analytics.capture("analytics-no-rounds.png");
});

test("load failed", async ({ analytics }) => {
  await analytics.openFailed();
  await analytics.seesLoadError();
  await analytics.capture("analytics-load-failed.png");
});

// A phone shows one part of the game at a time; desktop shows every section. Scoring opens first,
// so the populated captures above already show it.
const PHONE_TABS = [
  { tab: "Ball Striking", showing: "GIR % per Round", file: "ball-striking" },
  { tab: "Putting", showing: "Total Putts per Round", file: "putting" },
  { tab: "Profile", showing: "Avg Score by Hole Difficulty", file: "profile" },
  { tab: "Range View", showing: "Performance by yardage and par", file: "range" },
] as const;

test.describe("phone sections", { tag: "@phone" }, () => {
  for (const { tab, showing, file } of PHONE_TABS) {
    test(`${tab} section`, async ({ analytics }) => {
      await analytics.open();
      await analytics.openTab(tab);
      await analytics.seesTabOpen(tab, showing);
      await analytics.capture(`analytics-${file}.png`);
    });

    test(`${tab} section in dark mode`, async ({ analytics }) => {
      await analytics.dark();
      await analytics.open();
      await analytics.openTab(tab);
      await analytics.seesTabOpen(tab, showing);
      await analytics.capture(`analytics-${file}-dark.png`);
    });
  }
});

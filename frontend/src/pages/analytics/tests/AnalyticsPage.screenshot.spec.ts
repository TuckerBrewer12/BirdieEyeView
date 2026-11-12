import { LINKS, UNSEEDED_COURSE, test } from "./AnalyticsPage.robot";

test("scoring", async ({ analytics }) => {
  await analytics.open();
  await analytics.seesTabOpen("Scoring", "Score trend");
  await analytics.capture("analytics-scoring.png");
});

test("scoring in dark mode", async ({ analytics }) => {
  await analytics.dark();
  await analytics.open();
  await analytics.seesTabOpen("Scoring", "Score trend");
  await analytics.capture("analytics-scoring-dark.png");
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
  await analytics.capture("analytics-course-menu.png", { fullPage: false });
});

test("a course with no rounds", async ({ analytics }) => {
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

const SECTIONS = [
  { tab: "Profile", showing: "Player profile", file: "profile" },
  { tab: "Ball striking", showing: "Greens in regulation", file: "ball-striking" },
  { tab: "Putting", showing: "Putts per round", file: "putting" },
  { tab: "Approach", showing: "Avg to par", file: "approach" },
] as const;

for (const { tab, showing, file } of SECTIONS) {
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

test("profile with no scoring goal", async ({ analytics }) => {
  await analytics.openWithoutGoal();
  await analytics.openTab("Profile");
  await analytics.seesNoGoal();
  await analytics.capture("analytics-profile-no-goal.png");
});

test("profile against a friend", async ({ analytics }) => {
  await analytics.open();
  await analytics.openTab("Profile");
  await analytics.compareWith("Scratch");
  await analytics.seesComparedWith("Scratch");
  await analytics.capture("analytics-profile-scratch.png");
});

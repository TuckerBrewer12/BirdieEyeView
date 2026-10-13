import { test } from "./DashboardPage.robot";

test("populated dashboard", async ({ dashboard }) => {
  await dashboard.open();
  await dashboard.seesScoringAverage("76.8");
  await dashboard.capture("dashboard-populated.png");
});

test("populated dashboard in dark mode", async ({ dashboard }) => {
  await dashboard.dark();
  await dashboard.open();
  await dashboard.seesScoringAverage("76.8");
  await dashboard.capture("dashboard-populated-dark.png");
});

test("handicap sheet open", async ({ dashboard }) => {
  await dashboard.open();
  await dashboard.openHandicapSheet();
  await dashboard.seesHandicapSheet();
  await dashboard.capture("dashboard-handicap-sheet.png", { fullPage: false });
});

test("phone trend handicap and round tooltip", async ({ dashboard, isMobile }) => {
  // The HCP toggle and tap tooltip belong to the phone trend. Desktop keeps
  // the combined chart, so there is nothing to switch on that project.
  test.skip(!isMobile, "No phone trend at desktop width.");
  await dashboard.open();
  await dashboard.showTrend("HCP");
  await dashboard.seesTrendShowing("HCP");
  // Round 3 of 5 sits just past the middle of the plot.
  await dashboard.tapTrendAt(0.55);
  await dashboard.seesTrendTooltip("Round 3");
  await dashboard.seesTrendTooltip("HI");
  await dashboard.capture("dashboard-trend-handicap.png");
});

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

test("phone trend handicap and round tooltip", { tag: "@phone" }, async ({ dashboard }) => {
  await dashboard.open();
  await dashboard.showTrend("HCP");
  await dashboard.seesTrendShowing("HCP");
  await dashboard.tapTrendAt(0.55);
  await dashboard.seesTrendTooltip("Round 3");
  await dashboard.seesTrendTooltip("HI");
  await dashboard.capture("dashboard-trend-handicap.png");
});

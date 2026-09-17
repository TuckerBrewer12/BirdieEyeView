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

import { test } from "./DashboardPage.robot";

test("populated dashboard, light and dark", async ({ dashboard }) => {
  await dashboard.open();
  await dashboard.seesLastRound("Half Moon Bay", "78");
  await dashboard.capture("dashboard-populated.png");
  await dashboard.switchToDark();
  await dashboard.capture("dashboard-populated-dark.png");
});

test("handicap sheet open", async ({ dashboard }) => {
  await dashboard.open();
  await dashboard.openHandicapSheet();
  await dashboard.seesHandicapSheet();
  await dashboard.capture("dashboard-handicap-sheet.png", { fullPage: false });
});

test("a new golfer with no rounds", async ({ dashboard }) => {
  await dashboard.openAsNewGolfer();
  await dashboard.seesFirstRoundOffer();
  await dashboard.capture("dashboard-no-rounds.png");
});

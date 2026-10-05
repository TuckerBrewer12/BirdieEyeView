import { test } from "./DashboardPage.robot";

test("shows greeting and scoring average", async ({ dashboard }) => {
  await dashboard.open();
  await dashboard.seesGreeting();
  await dashboard.seesScoringAverage("76.8");
});

test("handicap sheet opens and closes", async ({ dashboard }) => {
  await dashboard.open();
  await dashboard.openHandicapSheet();
  await dashboard.seesHandicapSheet();
  await dashboard.closeHandicapSheet();
  await dashboard.doesNotSeeHandicapSheet();
});

test("tapping a milestone opens its round", async ({ dashboard }) => {
  await dashboard.open();
  await dashboard.tapMilestone("First round under par");
  await dashboard.isAtRound("round-3");
});

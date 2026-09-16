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

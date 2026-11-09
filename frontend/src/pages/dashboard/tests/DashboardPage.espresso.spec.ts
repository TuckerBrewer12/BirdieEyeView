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

test("tapping a played day on the activity calendar opens its round", async ({ dashboard }) => {
  await dashboard.open();
  await dashboard.tapActivityDay("2026-06-15");
  await dashboard.isAtRound("round-1");
});

test("the range switches to the last 20 rounds", async ({ dashboard }) => {
  await dashboard.open();
  await dashboard.seesWindow("Last 5");
  await dashboard.showWindow("Last 20");
  await dashboard.seesWindow("Last 20");
});

test("tapping a recent round opens it", async ({ dashboard }) => {
  await dashboard.open();
  await dashboard.openRecentRound("Blue Rock");
  await dashboard.isAtRound("round-3");
});

test("view all opens the round list", async ({ dashboard }) => {
  await dashboard.open();
  await dashboard.viewAllRounds();
  await dashboard.isAtRounds();
});

test.describe("on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test("tapping the goal card opens The Lab", async ({ dashboard }) => {
    await dashboard.open();
    await dashboard.tapGoal();
    await dashboard.isAtLab();
  });

  test("the handicap opens its breakdown from the bottom", async ({ dashboard }) => {
    await dashboard.open();
    await dashboard.openHandicapSheet();
    await dashboard.seesHandicapSheet();
    await dashboard.closeHandicapSheet();
    await dashboard.doesNotSeeHandicapSheet();
  });
});

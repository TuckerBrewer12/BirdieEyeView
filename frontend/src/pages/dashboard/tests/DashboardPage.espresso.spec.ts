import { test } from "./DashboardPage.robot";

test("leads with the last round", async ({ dashboard }) => {
  await dashboard.open();
  await dashboard.seesGreeting();
  await dashboard.seesLastRound("Half Moon Bay", "78");
  await dashboard.seesScoringAverage("74.7");
});

test("handicap sheet opens and closes", async ({ dashboard }) => {
  await dashboard.open();
  await dashboard.openHandicapSheet();
  await dashboard.seesHandicapSheet();
  await dashboard.closeHandicapSheet();
  await dashboard.doesNotSeeHandicapSheet();
});

test("the last round opens it", async ({ dashboard }) => {
  await dashboard.open();
  await dashboard.openLastRound();
  await dashboard.isAtRound("round-1");
});

test("the best round opens it", async ({ dashboard }) => {
  await dashboard.open();
  await dashboard.openBestRound();
  await dashboard.isAtRound("round-3");
});

test("tapping a recent round opens it", async ({ dashboard }) => {
  await dashboard.open();
  await dashboard.openRecentRound("Blue Rock");
  await dashboard.isAtRound("round-3");
});

test("see all opens the round list", async ({ dashboard }) => {
  await dashboard.open();
  await dashboard.seeAllRounds();
  await dashboard.isAtRounds();
});

test.describe("on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test("leads with the last round", async ({ dashboard }) => {
    await dashboard.open();
    await dashboard.seesLastRound("Half Moon Bay", "78");
    await dashboard.seesScoringAverage("74.7");
  });

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

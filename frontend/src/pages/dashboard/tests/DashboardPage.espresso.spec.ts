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

test.describe("on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test("the trend switches to the handicap, and a tap picks a round", async ({ dashboard }) => {
    await dashboard.open();
    await dashboard.showTrend("HCP");
    await dashboard.seesTrendShowing("HCP");
    // Round 3 of 5 sits just past the middle of the plot.
    await dashboard.tapTrendAt(0.55);
    await dashboard.seesTrendTooltip("Round 3");
    await dashboard.seesTrendTooltip("HI");
  });
});

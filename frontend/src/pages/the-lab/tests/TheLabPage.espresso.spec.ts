import { test } from "./TheLabPage.robot";

test("choosing a goal saves it to the profile and stands the page on it", async ({ lab }) => {
  await lab.open();
  await lab.seesGoalPicked("Break 90");
  await lab.seesGoalStanding("Break 90");

  await lab.pickGoal("Break 85");

  await lab.savedGoal(84);
  await lab.seesGoalPicked("Break 85");
  await lab.seesGoalStanding("Break 85");
});

test("a newly picked goal shows no figures until its own report loads", async ({ lab }) => {
  await lab.open();
  await lab.seesTimesAchieved("1");
  lab.holdGoalReports();

  await lab.pickGoal("Break 85");

  await lab.savedGoal(84);
  await lab.seesGoalStanding("Break 85");
  await lab.seesNoAttempts();

  lab.goalReportsArrive();
  await lab.seesTimesAchieved("1");
});

test("a goal the server rejects says so and leaves the current goal pressed", async ({ lab }) => {
  await lab.open();
  lab.failSavesWith("Couldn't save your goal.");

  await lab.pickGoal("Break 85");

  await lab.seesGoalSaveError("Couldn't save your goal.");
  await lab.seesGoalPicked("Break 90");
});

test("the savers read as the server wrote them", async ({ lab }) => {
  await lab.open();
  await lab.seesSaver("You average 2.0 three-putts a round");
  await lab.seesSaver("You hit 28% of greens in regulation");
});

test("comparing with a handicap draws its shape behind the golfer's", async ({ lab }) => {
  await lab.open();
  await lab.seesComparisonDrawn(false);

  await lab.compareWith("Breaks 80");

  await lab.seesShapeHeading("You vs. Break-80 Shape");
  await lab.seesComparisonDrawn(true);
});

test("comparing with a friend draws theirs, and says when one has no rounds", async ({ lab }) => {
  await lab.open();

  await lab.compareWith("A friend");
  await lab.seesShapeHeading("You vs. Avery Lin");
  await lab.seesComparisonDrawn(true);

  await lab.pickFriend("Jordan Castellanos");
  await lab.seesShapeNote("Jordan Castellanos needs more rounds to compare against.");
  await lab.seesComparisonDrawn(false);
});

test("with no friends, the friend comparison points to Social", async ({ lab }) => {
  await lab.open({ friends: {} });

  await lab.compareWith("A friend");

  await lab.seesShapeNote("Add friends in Social to compare with them.");
});

test("the peak game shows the best rounds against the nearest goal's shape", async ({ lab }) => {
  await lab.open();

  await lab.showShape("Peak Game");

  await lab.seesShapeHeading(/^You vs\. Your Peak Game/);
  await lab.seesComparisonDrawn(true);
});

test("a failed load offers a retry that loads the page", async ({ lab }) => {
  await lab.openFailing();
  await lab.seesLoadError("Analytics failed to load.");

  await lab.analyticsRecover();
  await lab.retry();

  await lab.seesLab();
  await lab.seesGoalStanding("Break 90");
});

test.describe("on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test("the performance tabs show one panel at a time", async ({ lab }) => {
    await lab.open();
    await lab.seesPanel("By Par");

    await lab.tapPanel("Putting");
    await lab.seesPanel("Putting");

    await lab.tapPanel("Peak");
    await lab.seesPanel("Peak");
    await lab.seesPeakBars();

    await lab.tapPanel("By Par");
    await lab.seesPanel("By Par");
  });

  test("tapping the open tab again keeps its panel open", async ({ lab }) => {
    await lab.open();
    await lab.tapPanel("Putting");

    await lab.tapPanel("Putting");

    await lab.seesPanel("Putting");
  });

  test("picking a goal saves it from the phone layout", async ({ lab }) => {
    await lab.open();

    await lab.pickGoal("Break 85");

    await lab.savedGoal(84);
    await lab.seesGoalPicked("Break 85");
    await lab.seesGoalStanding("Break 85");
  });

  test("comparing with a friend works from the phone layout", async ({ lab }) => {
    await lab.open();

    await lab.compareWith("A friend");

    await lab.seesShapeHeading("You vs. Avery Lin");
    await lab.seesComparisonDrawn(true);
  });
});

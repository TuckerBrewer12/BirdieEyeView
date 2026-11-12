import { LINKS, UNSEEDED_COURSE, test } from "./AnalyticsPage.robot";

test("opens on Scoring over the last 50 rounds at every course", async ({ analytics }) => {
  await analytics.open();
  await analytics.askedFor({ limit: 50, courseId: "all" });
  await analytics.seesTabOpen("Scoring", "Score trend");
});

test("picking a course loads that course's figures", async ({ analytics }) => {
  await analytics.open();
  await analytics.pickCourse(LINKS);
  await analytics.seesRounds(4);
  await analytics.askedFor({ courseId: "3e9094df-7893-5663-8230-0334b2d440ec" });
});

test("picking the home course asks for it", async ({ analytics }) => {
  await analytics.open();
  await analytics.pickCourse("Home course");
  await analytics.askedFor({ courseId: "home" });
});

test("picking a round count loads it", async ({ analytics }) => {
  await analytics.open();
  await analytics.pickRoundCount("Last 10 rounds");
  await analytics.askedFor({ limit: 10, courseId: "all" });
});

test("a course with no rounds says so, and picking every course brings the figures back", async ({ analytics }) => {
  await analytics.open();
  await analytics.pickCourse(UNSEEDED_COURSE);
  await analytics.seesNoMatchingRounds();
  await analytics.pickCourse("All courses");
  await analytics.seesRounds(24);
});

test("a failed load can be retried", async ({ analytics }) => {
  await analytics.openFailed();
  await analytics.seesLoadError();
  analytics.nextLoadSucceeds();
  await analytics.retry();
  await analytics.seesRounds(24);
});

test("the score trend switches to net", async ({ analytics }) => {
  await analytics.open();
  await analytics.seesScoreTrend("Score each round");
  await analytics.pickScoreReading("Net");
  await analytics.seesScoreTrend("Net score each round");
});

test("the score trend counts the kinds of hole turned on, on gross and net", async ({ analytics }) => {
  await analytics.open();
  await analytics.seesCountLines(0);
  await analytics.toggleLine("Birdies");
  await analytics.toggleLine("Doubles");
  await analytics.seesCountLines(2);
  await analytics.pickScoreReading("Net");
  await analytics.seesCountLines(2);
  await analytics.toggleLine("Birdies");
  await analytics.seesCountLines(1);
});

test("the score can be turned off, leaving the counts", async ({ analytics }) => {
  await analytics.open();
  await analytics.seesScoreLine(true);
  await analytics.toggleLine("Doubles");
  await analytics.toggleLine("Score");
  await analytics.seesScoreLine(false);
  await analytics.seesCountLines(1);
});

test("a trend's rounds slider holds across tabs", async ({ analytics }) => {
  await analytics.open();
  await analytics.openTab("Ball striking");
  await analytics.seesRoundsShown("All 24 rounds");
  await analytics.showFewerRounds(4);
  await analytics.seesRoundsShown("Last 20 of 24");
  await analytics.openTab("Putting");
  await analytics.seesRoundsShown("All 24 rounds");
  await analytics.openTab("Ball striking");
  await analytics.seesRoundsShown("Last 20 of 24");
});

test("each section tab opens its cards", async ({ analytics }) => {
  await analytics.open();
  await analytics.openTab("Ball striking");
  await analytics.seesTabOpen("Ball striking", "Short game");
  await analytics.openTab("Putting");
  await analytics.seesTabOpen("Putting", "Putts per hole");
  await analytics.openTab("Approach");
  await analytics.seesTabOpen("Approach", "Avg to par");
  await analytics.openTab("Profile");
  await analytics.seesTabOpen("Profile", "Player profile");
});

test("Approach opens on par 4s and switches par type", async ({ analytics }) => {
  await analytics.open();
  await analytics.openTab("Approach");
  await analytics.seesYardageBand("350–399");
  await analytics.pickApproachPar(3);
  await analytics.seesYardageBand("150–199");
});

test("The Lab's address opens Profile", async ({ analytics }) => {
  await analytics.openLab();
  await analytics.seesTabOpen("Profile", "Player profile");
});

test("Profile holds the shape up against the next level, then the one picked", async ({ analytics }) => {
  await analytics.open();
  await analytics.openTab("Profile");
  await analytics.seesComparedWith("5 handicap");
  await analytics.compareWith("Scratch");
  await analytics.seesComparedWith("Scratch");
});

test("Profile shows where to find the strokes and the peak game", async ({ analytics }) => {
  await analytics.open();
  await analytics.openTab("Profile");
  await analytics.seesSavers(/^Where to find [\d.]+ strokes/);
  await analytics.seesPeakGame(/best \d · ([\d.]+ off|breaks) \d+/, ["Birdies", "Bogeys", "Doubles or worse"]);
});

test("Profile compares with a friend, and says when one has too few rounds", async ({ analytics }) => {
  await analytics.openWithFriends();
  await analytics.openTab("Profile");
  await analytics.compareWith("Avery Lin");
  await analytics.seesComparedWith("Avery Lin");
  await analytics.compareWith("Jordan Castellanos");
  await analytics.seesFriendNote(/Jordan Castellanos needs more rounds/);
});

test("a failed Profile load can be retried", async ({ analytics }) => {
  await analytics.openWithProfileFailing();
  await analytics.openTab("Profile");
  await analytics.seesProfileError();
  analytics.profileLoadsNext();
  await analytics.retry();
  await analytics.seesTabOpen("Profile", "Player profile");
});

test("picking a goal saves it", async ({ analytics }) => {
  await analytics.open();
  await analytics.openTab("Profile");
  await analytics.pickGoal("Break 85");
  await analytics.seesGoalSaved(84);
});

test.describe("on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test("picking a course from the sheet loads that course", async ({ analytics }) => {
    await analytics.open();
    await analytics.pickCourse(LINKS);
    await analytics.seesRounds(4);
  });

  test("each section tab opens its cards", async ({ analytics }) => {
    await analytics.open();
    await analytics.openTab("Putting");
    await analytics.seesTabOpen("Putting", "Putts per hole");
    await analytics.openTab("Approach");
    await analytics.seesTabOpen("Approach", "Avg to par");
    await analytics.openTab("Profile");
    await analytics.seesTabOpen("Profile", "Player profile");
  });

  test("picking a round count from the sheet loads it", async ({ analytics }) => {
    await analytics.open();
    await analytics.pickRoundCount("Last 20 rounds");
    await analytics.askedFor({ limit: 20, courseId: "all" });
  });

  test("Profile saves a goal picked from the sheet", async ({ analytics }) => {
    await analytics.open();
    await analytics.openTab("Profile");
    await analytics.pickGoal("Break 85");
    await analytics.seesGoalSaved(84);
  });

  test("Profile compares with a friend from the sheet", async ({ analytics }) => {
    await analytics.openWithFriends();
    await analytics.openTab("Profile");
    await analytics.compareWith("Avery Lin");
    await analytics.seesComparedWith("Avery Lin");
  });
});

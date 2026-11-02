import { LINKS, UNSEEDED_COURSE, test } from "./AnalyticsPage.robot";

test("opens on the last 50 rounds at every course", async ({ analytics }) => {
  await analytics.open();
  await analytics.askedFor({ limit: 50, timeframe: "all", courseId: "all" });
});

test("picking a course loads that course's figures", async ({ analytics }) => {
  await analytics.open();
  await analytics.pickCourse(LINKS);
  await analytics.seesRounds(4);
  await analytics.askedFor({ courseId: "3e9094df-7893-5663-8230-0334b2d440ec" });
});

test("picking the home course asks for it", async ({ analytics }) => {
  await analytics.open();
  await analytics.pickCourse("Home Course");
  await analytics.askedFor({ courseId: "home" });
});

test("picking a timeframe and a round count loads them", async ({ analytics }) => {
  await analytics.open();
  await analytics.pickRange("YTD");
  await analytics.askedFor({ limit: 50, timeframe: "ytd", courseId: "all" });
  await analytics.pickRange("10");
  await analytics.askedFor({ limit: 10, timeframe: "ytd", courseId: "all" });
});

test("a course with no rounds says so, and clearing it brings the figures back", async ({ analytics }) => {
  await analytics.open();
  await analytics.pickCourse(UNSEEDED_COURSE);
  await analytics.seesNoMatchingRounds();
  await analytics.clearCourse();
  await analytics.seesRounds(24);
});

test("a failed load can be retried", async ({ analytics }) => {
  await analytics.openFailed();
  await analytics.seesLoadError();
  analytics.nextLoadSucceeds();
  await analytics.retry();
  await analytics.seesRounds(24);
});

test("the best round's card opens that round", async ({ analytics }) => {
  await analytics.open();
  await analytics.openBestRound();
});

test("the range view opens on par 4s and switches par type", async ({ analytics }) => {
  await analytics.open();
  await analytics.seesYardageBand("350–399");
  await analytics.pickRangePar(3);
  await analytics.seesYardageBand("150–199");
});

test.describe("on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test("the filter pills set the timeframe and round count", async ({ analytics }) => {
    await analytics.open();
    await analytics.pickRange("20");
    await analytics.askedFor({ limit: 20, timeframe: "all" });
    await analytics.pickRange("YTD");
    await analytics.askedFor({ limit: 20, timeframe: "ytd" });
  });

  test("picking a course from the menu loads that course, and clearing it goes back", async ({ analytics }) => {
    await analytics.open();
    await analytics.pickCourse(LINKS);
    await analytics.seesRounds(4);
    await analytics.askedFor({ courseId: "3e9094df-7893-5663-8230-0334b2d440ec" });
    await analytics.clearCourse();
    await analytics.seesRounds(24);
  });

  test("the course menu offers the home course", async ({ analytics }) => {
    await analytics.open();
    await analytics.pickCourse("Home Course");
    await analytics.askedFor({ courseId: "home" });
  });

  test("filtering down to no rounds keeps the filters up", async ({ analytics }) => {
    await analytics.open();
    await analytics.pickCourse(UNSEEDED_COURSE);
    await analytics.seesNoMatchingRounds();
    await analytics.clearCourse();
    await analytics.seesRounds(24);
  });

  test("each section tab opens its cards", async ({ analytics }) => {
    await analytics.open();
    await analytics.seesTabOpen("Scoring", "Score Trend");
    await analytics.openTab("Ball Striking");
    await analytics.seesTabOpen("Ball Striking", "GIR % per Round");
    await analytics.seesInsight(/^Your average GIR% is/);
    await analytics.openTab("Putting");
    await analytics.seesTabOpen("Putting", "Total Putts per Round");
    await analytics.seesInsight(/putts per round/);
    await analytics.openTab("Profile");
    await analytics.seesTabOpen("Profile", "Avg Score by Hole Difficulty");
    await analytics.openTab("Range View");
    await analytics.seesTabOpen("Range View", "Performance by yardage and par");
  });

  test("tapping the open tab keeps it open", async ({ analytics }) => {
    await analytics.open();
    await analytics.openTab("Putting");
    await analytics.openTab("Putting");
    await analytics.seesTabOpen("Putting", "Total Putts per Round");
  });

  test("the range view switches par type", async ({ analytics }) => {
    await analytics.open();
    await analytics.openTab("Range View");
    await analytics.seesYardageBand("350–399");
    await analytics.pickRangePar(3);
    await analytics.seesYardageBand("150–199");
  });

  test("the best round's card opens that round", async ({ analytics }) => {
    await analytics.open();
    await analytics.openBestRound();
  });
});

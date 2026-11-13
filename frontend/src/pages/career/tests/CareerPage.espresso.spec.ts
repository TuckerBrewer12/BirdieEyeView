import { BREAK_80_ROUND_ID, LOWEST_ROUND_ID, test } from "./CareerPage.robot";

test("career asks for every round, the same request as Analytics' All", async ({ career }) => {
  await career.open();
  await career.askedFor({ limit: 500, timeframe: "all", courseId: "all" });
});

test("the last 365 days shows the year's totals and records, and Lifetime brings the career back", async ({
  career,
}) => {
  await career.open();
  await career.seesWindowPicked("Lifetime");
  await career.seesTotal("Pars", "183");

  await career.pickWindow("Last 365 Days");

  await career.seesWindowPicked("Last 365 Days");
  await career.seesTotalsTitle("Year Totals");
  await career.seesTotal("Triples", "4");
  await career.seesNoTotal("Pars");
  await career.seesMilestoneNote("Career Milestones", "7 new personal records in the last 365 days.");
  await career.seesNoMilestone("Career Milestones", "Hole-in-One");

  await career.pickWindow("Lifetime");

  await career.seesTotalsTitle("Career Totals");
  await career.seesTotal("Pars", "183");
  await career.seesMilestone("Career Milestones", "Hole-in-One", false);
});

test("a record opens the round it was set in", async ({ career }) => {
  await career.open();
  await career.seesRecord("Lowest Round", "75");

  await career.openRecord("Lowest Round");

  await career.isAtRound(LOWEST_ROUND_ID);
});

test("a milestone opens the round it was first reached in", async ({ career }) => {
  await career.open();

  await career.openMilestone("Career Milestones", "Break 80");

  await career.isAtRound(BREAK_80_ROUND_ID);
});

test("a year on, a putting milestone first reached before the last year drops out of it", async ({ career }) => {
  await career.openLater();
  await career.seesMilestone("Putting Milestones", "Break 30 Putts", true);

  await career.pickWindow("Last 365 Days");

  await career.seesMilestone("Putting Milestones", "Break 30 Putts", false);
  await career.seesMilestone("GIR Milestones", "9/18 GIR", true);
});

test("the handicap trend follows the window: every round, then only the last year's", async ({ career }) => {
  await career.openLater();
  await career.seesTrendRounds("24 rounds");

  await career.pickWindow("Last 365 Days");
  await career.seesTrendRounds("16 rounds");

  await career.pickWindow("Lifetime");
  await career.seesTrendRounds("24 rounds");
});

test("a failed load offers a retry that brings the career in", async ({ career }) => {
  await career.openFailed();
  await career.seesLoadError();

  career.nextLoadSucceeds();
  await career.retry();

  await career.seesCareer();
});

test.describe("on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test("the milestone tabs show one list at a time, and re-tapping the open one keeps it", async ({ career }) => {
    await career.open();
    await career.seesMilestone("Milestones", "Break 80", true);

    await career.tapMilestoneTab("Putting");
    await career.seesMilestone("Milestones", "Break 30 Putts", true);
    await career.seesNoMilestone("Milestones", "Break 80");

    await career.tapMilestoneTab("Putting");
    await career.seesMilestone("Milestones", "Break 30 Putts", true);

    await career.tapMilestoneTab("GIR");
    await career.seesMilestone("Milestones", "9/18 GIR", true);
    await career.seesNoMilestone("Milestones", "Break 30 Putts");
  });
});

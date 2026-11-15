import { test } from "./CareerPage.robot";

test("populated career", async ({ career }) => {
  await career.open();
  await career.seesCareer();
  await career.capture("career-populated.png");
});

test("populated career in dark mode", async ({ career }) => {
  await career.dark();
  await career.open();
  await career.seesCareer();
  await career.capture("career-populated-dark.png");
});

test("the last year's records", async ({ career }) => {
  await career.openLater();
  await career.pickWindow("Last 365 Days");
  await career.seesTotalsTitle("Year Totals");
  await career.capture("career-last-year.png");
});

test("no rounds yet", async ({ career }) => {
  await career.openWithoutRounds();
  await career.seesNoRoundsYet();
  await career.capture("career-no-rounds.png");
});

test("load failed", async ({ career }) => {
  await career.openFailed();
  await career.seesLoadError();
  await career.capture("career-load-failed.png");
});

const PHONE_TABS = [
  { tab: "Putting", milestone: "Break 30 Putts", file: "putting" },
  { tab: "GIR", milestone: "9/18 GIR", file: "gir" },
] as const;

test.describe("phone milestones", { tag: "@phone" }, () => {
  for (const { tab, milestone, file } of PHONE_TABS) {
    test(`${tab} milestones`, async ({ career }) => {
      await career.open();
      await career.tapMilestoneTab(tab);
      await career.seesMilestone("Milestones", milestone, true);
      await career.capture(`career-milestones-${file}.png`);
    });

    test(`${tab} milestones in dark mode`, async ({ career }) => {
      await career.dark();
      await career.open();
      await career.tapMilestoneTab(tab);
      await career.seesMilestone("Milestones", milestone, true);
      await career.capture(`career-milestones-${file}-dark.png`);
    });
  }
});

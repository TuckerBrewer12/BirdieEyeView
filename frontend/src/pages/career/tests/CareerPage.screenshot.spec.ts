import { test } from "./CareerPage.robot";

test("populated career", async ({ career }) => {
  await career.open();
  await career.capture("career-populated.png");
});

test("populated career in dark mode", async ({ career }) => {
  await career.dark();
  await career.open();
  await career.capture("career-populated-dark.png");
});

test("the last year's records", async ({ career }) => {
  await career.open();
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

for (const tab of ["Putting", "GIR"] as const) {
  for (const dark of [false, true]) {
    test(`phone ${tab} milestones${dark ? " in dark mode" : ""}`, async ({ career, isMobile }) => {
      test.skip(!isMobile, "The milestone tabs are phone-only.");
      if (dark) await career.dark();
      await career.open();
      await career.tapMilestoneTab(tab);
      await career.seesMilestone("Milestones", tab === "Putting" ? "Break 30 Putts" : "9/18 GIR", true);
      await career.capture(`career-milestones-${tab.toLowerCase()}${dark ? "-dark" : ""}.png`);
    });
  }
}

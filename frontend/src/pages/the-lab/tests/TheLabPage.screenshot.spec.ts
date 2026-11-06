import { test } from "./TheLabPage.robot";

test("populated lab", async ({ lab }) => {
  await lab.open();
  await lab.seesLab();
  await lab.capture("lab-populated.png");
});

test("populated lab in dark mode", async ({ lab }) => {
  await lab.dark();
  await lab.open();
  await lab.seesLab();
  await lab.capture("lab-populated-dark.png");
});

test("no goal set", async ({ lab }) => {
  await lab.openWithoutGoal();
  await lab.seesLab();
  await lab.capture("lab-no-goal.png");
});

test("compared with a friend", async ({ lab }) => {
  await lab.open();
  await lab.compareWith("A friend");
  await lab.seesShapeHeading("You vs. Avery Lin");
  await lab.capture("lab-friend-compare.png");
});

const PANELS = [
  { tab: "By Par", file: "by-par" },
  { tab: "Putting", file: "putting" },
] as const;

test.describe("phone panels", { tag: "@phone" }, () => {
  for (const { tab, file } of PANELS) {
    test(`${tab} panel`, async ({ lab }) => {
      await lab.open();
      await lab.seesLab();
      await lab.tapPanel(tab);
      await lab.seesPanel(tab);
      await lab.capture(`lab-panel-${file}.png`);
    });

    test(`${tab} panel in dark mode`, async ({ lab }) => {
      await lab.dark();
      await lab.open();
      await lab.seesLab();
      await lab.tapPanel(tab);
      await lab.seesPanel(tab);
      await lab.capture(`lab-panel-${file}-dark.png`);
    });
  }

  test("Peak panel", async ({ lab }) => {
    await lab.open();
    await lab.seesLab();
    await lab.tapPanel("Peak");
    await lab.seesPanel("Peak");
    await lab.seesPeakBars();
    await lab.capture("lab-panel-peak.png");
  });

  test("Peak panel in dark mode", async ({ lab }) => {
    await lab.dark();
    await lab.open();
    await lab.seesLab();
    await lab.tapPanel("Peak");
    await lab.seesPanel("Peak");
    await lab.seesPeakBars();
    await lab.capture("lab-panel-peak-dark.png");
  });
});

test("load error", async ({ lab }) => {
  await lab.openFailing();
  await lab.seesLoadError("Analytics failed to load.");
  await lab.capture("lab-load-error.png", { fullPage: false });
});

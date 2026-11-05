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

// A phone shows par types, putting and the peak game one tab at a time; desktop shows every card.
const PANELS = [
  { tab: "By Par", file: "by-par" },
  { tab: "Putting", file: "putting" },
  { tab: "Peak", file: "peak" },
] as const;

for (const { tab, file } of PANELS) {
  for (const dark of [false, true]) {
    test(`phone ${tab} panel${dark ? " in dark mode" : ""}`, async ({ lab, isMobile }) => {
      test.skip(!isMobile, "The panel tabs are phone-only.");
      if (dark) await lab.dark();
      await lab.open();
      await lab.seesLab();
      await lab.tapPanel(tab);
      await lab.seesPanel(tab);
      if (tab === "Peak") await lab.seesPeakBars();
      await lab.capture(`lab-panel-${file}${dark ? "-dark" : ""}.png`);
    });
  }
}

test("load error", async ({ lab }) => {
  await lab.openFailing();
  await lab.seesLoadError("Analytics failed to load.");
  await lab.capture("lab-load-error.png", { fullPage: false });
});

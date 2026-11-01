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

test("compared with a friend", async ({ lab, isMobile }) => {
  // The phone keeps the legacy layout until the next Lab PR, so this control is desktop-only for now.
  test.skip(isMobile, "The kit comparison controls are desktop-only in this PR.");
  await lab.open();
  await lab.compareWith("A friend");
  await lab.seesShapeHeading("You vs. Avery Lin");
  await lab.capture("lab-friend-compare.png");
});

test("load error", async ({ lab }) => {
  await lab.openFailing();
  await lab.seesLoadError("Analytics failed to load.");
  await lab.capture("lab-load-error.png", { fullPage: false });
});

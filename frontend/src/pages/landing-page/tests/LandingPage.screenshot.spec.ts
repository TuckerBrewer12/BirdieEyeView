import { test } from "./LandingPage.robot";

test("landing page", async ({ landing }) => {
  await landing.open();
  await landing.seesHeadline("Scan your scorecard.");
  await landing.capture("landing.png");
});

test("landing page in dark mode", async ({ landing }) => {
  await landing.dark();
  await landing.open();
  await landing.seesHeadline("Scan your scorecard.");
  await landing.capture("landing-dark.png");
});

test("a chosen card, ready to scan", async ({ landing }) => {
  await landing.open();
  await landing.chooseScorecard();
  await landing.seesChosenCard();
  await landing.capture("landing-card-chosen.png");
});

test("a scanned card, with the way to keep it", async ({ landing }) => {
  await landing.open();
  await landing.chooseScorecard();
  await landing.tapScan();
  await landing.seesScannedCard();
  await landing.capture("landing-scanned.png");
});

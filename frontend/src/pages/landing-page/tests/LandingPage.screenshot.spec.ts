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

test("the card being read", async ({ landing }) => {
  await landing.open({ holdScan: true });
  await landing.chooseScorecard();
  await landing.tapScan();
  await landing.seesReading();
  await landing.capture("landing-reading.png");
});

test("a scanned card gets the full width", async ({ landing }) => {
  await landing.open();
  await landing.chooseScorecard();
  await landing.tapScan();
  await landing.seesScannedCard();
  await landing.capture("landing-scanned.png");
});

// The menu button only exists below the md breakpoint, so there is nothing
// to open on the desktop project.
test("mobile nav menu open", { tag: "@phone" }, async ({ landing }) => {
  await landing.open();
  await landing.openMenu();
  await landing.seesMenuOpen(true);
  await landing.capture("landing-menu-open.png");
});

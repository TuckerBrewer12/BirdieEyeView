import { test } from "./LandingPage.robot";

test("landing page", async ({ landing }) => {
  await landing.open();
  await landing.seesHeadline("Just Snap a Scorecard.");
  await landing.capture("landing.png");
});

test("landing page in dark mode", async ({ landing }) => {
  await landing.dark();
  await landing.open();
  await landing.seesHeadline("Just Snap a Scorecard.");
  await landing.capture("landing-dark.png");
});

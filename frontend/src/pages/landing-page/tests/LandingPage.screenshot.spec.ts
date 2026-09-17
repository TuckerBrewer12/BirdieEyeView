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

test("mobile nav menu open", async ({ landing, isMobile }) => {
  // The menu button only exists below the md breakpoint, so there is nothing
  // to open on the desktop project.
  test.skip(!isMobile, "No menu button at desktop width.");
  await landing.open();
  await landing.openMenu();
  await landing.capture("landing-menu-open.png");
});

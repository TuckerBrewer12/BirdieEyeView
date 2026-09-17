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

test.describe("on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("mobile nav menu open", async ({ landing }) => {
    await landing.open();
    await landing.openMenu();
    await landing.seesMenuOpen(true);
    await landing.capture("landing-menu-open.png");
  });
});

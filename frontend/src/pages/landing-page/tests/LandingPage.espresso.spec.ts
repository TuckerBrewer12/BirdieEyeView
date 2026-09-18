import { test } from "./LandingPage.robot";

test("the hero's secondary call to action scrolls to how it works", async ({ landing }) => {
  await landing.open();
  await landing.tapSeeHowItWorks();
  await landing.seesSection("how-it-works");
});

test("the hero call to action goes to register", async ({ landing }) => {
  await landing.open();
  await landing.tapSignUp();
  await landing.goesTo("/register");
});

test.describe("on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("a nav link scrolls and closes the menu behind it", async ({ landing }) => {
    await landing.open();
    await landing.openMenu();
    await landing.seesMenuOpen(true);
    await landing.tapNavLink("Try It Out");
    await landing.seesSection("try-it-out");
    await landing.seesMenuOpen(false);
  });
});

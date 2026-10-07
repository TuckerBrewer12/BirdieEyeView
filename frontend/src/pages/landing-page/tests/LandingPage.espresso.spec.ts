import { test } from "./LandingPage.robot";

test("the scanner is on screen without scrolling", async ({ landing }) => {
  await landing.open();
  await landing.seesScanner();
});

test("the nav's sign up goes to register", async ({ landing }) => {
  await landing.open();
  await landing.tapSignUp();
  await landing.goesTo("/register");
});

test("the theme toggle switches the page, and the choice survives a reload", async ({ landing }) => {
  await landing.open();
  await landing.seesTheme("light");
  await landing.tapThemeToggle();
  await landing.seesTheme("dark");
  await landing.reload();
  await landing.seesTheme("dark");
  await landing.tapThemeToggle();
  await landing.seesTheme("light");
});

test.describe("on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("the scanner is on screen without scrolling", async ({ landing }) => {
    await landing.open();
    await landing.seesScanner();
  });
});

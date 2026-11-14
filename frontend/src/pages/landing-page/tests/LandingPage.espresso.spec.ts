import { test } from "./LandingPage.robot";

test("the scanner is on screen without scrolling", async ({ landing }) => {
  await landing.open();
  await landing.seesScanner();
});

test("the hero's photo gives way to the card's setup, then to the scanned round", async ({ landing }) => {
  await landing.open();
  await landing.seesHeroPhoto();
  await landing.chooseScorecard();
  await landing.seesChosenCard();
  await landing.seesHeroPhoto(false);
  await landing.tapScan();
  await landing.seesScannedCard();
});

test("Sign up free under the scanned round goes to register", async ({ landing }) => {
  await landing.open();
  await landing.chooseScorecard();
  await landing.tapScan();
  await landing.seesScannedCard();
  await landing.tapSignUp("Sign up free");
  await landing.goesTo("/register");
});

test("a failed scan keeps the photo and says why", async ({ landing }) => {
  await landing.open({ scanFails: true });
  await landing.chooseScorecard();
  await landing.tapScan();
  await landing.seesScanFailed();
});

test("a failed scan can be reported without an account", async ({ landing }) => {
  await landing.open({ scanFails: true, reportStorage: true });
  await landing.chooseScorecard();
  await landing.tapScan();
  await landing.seesScanFailed();
  await landing.tapReportScan();
  await landing.seesReportSent();
});

test("Sign up free beside Try it goes to register", async ({ landing }) => {
  await landing.open();
  await landing.tapSignUp("Sign up free");
  await landing.goesTo("/register");
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

  test("scan another is in reach on the scanned card and starts over", async ({ landing }) => {
    await landing.open();
    await landing.chooseScorecard();
    await landing.tapScan();
    await landing.seesScannedCard();
    await landing.tapScanAnother();
    await landing.seesScanner();
  });

  test("the scanner is on screen without scrolling", async ({ landing }) => {
    await landing.open();
    await landing.seesScanner();
  });

  test("or sign up free, under Try it, goes to register", async ({ landing }) => {
    await landing.open();
    await landing.tapSignUp("sign up free");
    await landing.goesTo("/register");
  });
});

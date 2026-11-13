import { test } from "./LandingPage.robot";

test("the scanner is on screen without scrolling", async ({ landing }) => {
  await landing.open();
  await landing.seesScanner();
});

test("the demo stays while a card is chosen and steps aside once it is scanned", async ({ landing }) => {
  await landing.open();
  await landing.chooseScorecard();
  await landing.seesDemo();
  await landing.tapScan();
  await landing.seesScannedCard();
  await landing.seesDemo(false);
});

test("the scan is told the visitor's name, the scores to par, and the rows on the card", async ({ landing }) => {
  await landing.open();
  await landing.chooseScorecard();
  await landing.nameOnCard("Tucker");
  await landing.scoresWrittenToPar();
  await landing.markOnCard("Putts");
  await landing.markOnCard("Shots to green");
  await landing.tapScan();
  await landing.seesScannedCard();
  await landing.seesScanNote(
    "my name is Tucker. scores written to par. name on score row. row order: score, putts, shots to green",
  );
});

test("a failed scan keeps the photo and says why", async ({ landing }) => {
  await landing.open({ scanFails: true });
  await landing.chooseScorecard();
  await landing.tapScan();
  await landing.seesScanFailed();
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

  test("the menu toggle opens and closes the menu", async ({ landing }) => {
    await landing.open();
    await landing.seesMenuOpen(false);
    await landing.openMenu();
    await landing.seesMenuOpen(true);
    await landing.closeMenu();
    await landing.seesMenuOpen(false);
  });
});

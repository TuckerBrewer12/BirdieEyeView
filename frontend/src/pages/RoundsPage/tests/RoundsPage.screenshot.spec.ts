import { test } from "@playwright/test";
import { populatedRounds } from "../../../testing/fixtures/rounds";
import { onRounds } from "./RoundsPage.robot";

test.describe("Rounds page screenshots", () => {
  test("populated list", async ({ page }) => {
    await onRounds(page, async (rounds) => {
      await rounds.open(populatedRounds);
      await rounds.seesCourse("Half Moon Bay");
      await rounds.capture("rounds-populated.png");
    });
  });

  test("populated list in dark mode", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("settings_theme", "dark");
      localStorage.setItem("public_theme", "dark");
    });
    await onRounds(page, async (rounds) => {
      await rounds.open(populatedRounds);
      await rounds.seesCourse("Half Moon Bay");
      await rounds.capture("rounds-populated-dark.png");
    });
  });

  test("empty list", async ({ page }) => {
    await onRounds(page, async (rounds) => {
      await rounds.open([]);
      await rounds.seesEmptyState();
      await rounds.capture("rounds-empty.png");
    });
  });

  test("course link panel open", async ({ page }) => {
    await onRounds(page, async (rounds) => {
      await rounds.open(populatedRounds);
      await rounds.openLinkFor("Scanned Scorecard");
      await rounds.seesLinkPanel("Scanned Scorecard");
      await rounds.seesChipPressed("All");
      await rounds.capture("rounds-link-open.png");
    });
  });
});

import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../../../brand/tests/previewScreenshot";

test.describe("ScoringHeroCard", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "ScoringHeroCard", "scoring-hero-card.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "ScoringHeroCard", "scoring-hero-card-dark.png");
  });
});

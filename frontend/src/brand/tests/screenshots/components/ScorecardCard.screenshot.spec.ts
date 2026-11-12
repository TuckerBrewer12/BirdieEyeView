import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../previewScreenshot";

test.describe("ScorecardCard", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "ScorecardCard", "scorecard-card.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "ScorecardCard", "scorecard-card-dark.png");
  });
});

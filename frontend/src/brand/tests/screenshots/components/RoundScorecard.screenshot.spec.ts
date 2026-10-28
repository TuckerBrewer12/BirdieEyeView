import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../previewScreenshot";

test.describe("RoundScorecard", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "RoundScorecard", "round-scorecard.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "RoundScorecard", "round-scorecard-dark.png");
  });
});

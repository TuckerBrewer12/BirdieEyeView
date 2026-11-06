import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../previewScreenshot";

test.describe("HoleScoreMixBars", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "HoleScoreMixBars", "hole-score-mix-bars.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "HoleScoreMixBars", "hole-score-mix-bars-dark.png");
  });
});

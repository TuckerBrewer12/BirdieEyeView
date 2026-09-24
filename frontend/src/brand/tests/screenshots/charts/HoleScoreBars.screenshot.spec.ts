import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../previewScreenshot";

test.describe("HoleScoreBars", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "HoleScoreBars", "hole-score-bars.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "HoleScoreBars", "hole-score-bars-dark.png");
  });
});

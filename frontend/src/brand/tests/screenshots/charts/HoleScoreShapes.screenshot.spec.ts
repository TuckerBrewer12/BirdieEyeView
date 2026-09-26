import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../previewScreenshot";

test.describe("HoleScoreShapes", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "HoleScoreShapes", "hole-score-shapes.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "HoleScoreShapes", "hole-score-shapes-dark.png");
  });
});

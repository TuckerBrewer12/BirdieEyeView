import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../previewScreenshot";

test.describe("ScoreTargetChart", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "ScoreTargetChart", "score-target-chart.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "ScoreTargetChart", "score-target-chart-dark.png");
  });
});

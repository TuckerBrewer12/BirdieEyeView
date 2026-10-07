import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../previewScreenshot";

test.describe("ScoreTrendChart", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "ScoreTrendChart", "score-trend-chart.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "ScoreTrendChart", "score-trend-chart-dark.png");
  });
});

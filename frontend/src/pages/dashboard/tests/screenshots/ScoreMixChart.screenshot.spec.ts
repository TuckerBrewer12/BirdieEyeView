import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../../../brand/tests/previewScreenshot";

test.describe("ScoreMixChart", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "ScoreMixChart", "score-mix-chart.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "ScoreMixChart", "score-mix-chart-dark.png");
  });
});

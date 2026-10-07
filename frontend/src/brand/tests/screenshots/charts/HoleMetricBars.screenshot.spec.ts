import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../previewScreenshot";

test.describe("HoleMetricBars", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "HoleMetricBars", "hole-metric-bars.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "HoleMetricBars", "hole-metric-bars-dark.png");
  });
});

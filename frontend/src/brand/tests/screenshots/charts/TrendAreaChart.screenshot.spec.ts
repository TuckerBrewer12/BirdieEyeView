import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../previewScreenshot";

test.describe("TrendAreaChart", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "TrendAreaChart", "trend-area-chart.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "TrendAreaChart", "trend-area-chart-dark.png");
  });
});

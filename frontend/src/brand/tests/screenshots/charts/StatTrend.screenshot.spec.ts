import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../previewScreenshot";

test.describe("StatTrend", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "StatTrend", "stat-trend.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "StatTrend", "stat-trend-dark.png");
  });
});

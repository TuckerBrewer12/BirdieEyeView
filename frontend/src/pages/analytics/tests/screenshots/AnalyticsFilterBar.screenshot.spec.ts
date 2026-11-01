import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../../../brand/tests/previewScreenshot";

test.describe("AnalyticsFilterBar", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "AnalyticsFilterBar", "analytics-filter-bar.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "AnalyticsFilterBar", "analytics-filter-bar-dark.png");
  });
});

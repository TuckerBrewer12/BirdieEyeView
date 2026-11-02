import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../../../brand/tests/previewScreenshot";

test.describe("AnalyticsKpis", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "AnalyticsKpis", "analytics-kpis.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "AnalyticsKpis", "analytics-kpis-dark.png");
  });
});

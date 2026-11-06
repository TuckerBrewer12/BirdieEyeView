import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../previewScreenshot";

test.describe("ChartTabs", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "ChartTabs", "chart-tabs.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "ChartTabs", "chart-tabs-dark.png");
  });
});

import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../previewScreenshot";

test.describe("RadarChart", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "RadarChart", "radar-chart.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "RadarChart", "radar-chart-dark.png");
  });
});

import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../previewScreenshot";

test.describe("RadarSummary", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "RadarSummary", "radar-summary.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "RadarSummary", "radar-summary-dark.png");
  });
});

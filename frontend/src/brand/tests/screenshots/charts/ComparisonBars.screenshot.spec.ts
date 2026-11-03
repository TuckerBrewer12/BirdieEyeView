import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../previewScreenshot";

test.describe("ComparisonBars", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "ComparisonBars", "comparison-bars.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "ComparisonBars", "comparison-bars-dark.png");
  });
});

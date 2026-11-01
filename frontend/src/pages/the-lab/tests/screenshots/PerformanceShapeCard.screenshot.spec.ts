import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../../../brand/tests/previewScreenshot";

test.describe("PerformanceShapeCard", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "PerformanceShapeCard", "performance-shape-card.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "PerformanceShapeCard", "performance-shape-card-dark.png");
  });
});

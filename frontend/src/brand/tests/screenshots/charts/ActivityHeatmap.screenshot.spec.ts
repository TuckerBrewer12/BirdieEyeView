import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../previewScreenshot";

test.describe("ActivityHeatmap", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "ActivityHeatmap", "activity-heatmap.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "ActivityHeatmap", "activity-heatmap-dark.png");
  });
});

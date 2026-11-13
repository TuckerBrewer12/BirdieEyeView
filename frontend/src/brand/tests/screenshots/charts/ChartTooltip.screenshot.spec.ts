import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../previewScreenshot";

test.describe("ChartTooltip", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "ChartTooltip", "chart-tooltip.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "ChartTooltip", "chart-tooltip-dark.png");
  });
});

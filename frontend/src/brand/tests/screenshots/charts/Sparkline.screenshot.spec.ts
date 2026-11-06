import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../previewScreenshot";

test.describe("Sparkline", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "Sparkline", "sparkline.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "Sparkline", "sparkline-dark.png");
  });
});

import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../previewScreenshot";

test.describe("Slider", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "Slider", "slider.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "Slider", "slider-dark.png");
  });
});

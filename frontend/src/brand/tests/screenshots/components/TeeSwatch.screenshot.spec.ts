import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../previewScreenshot";

test.describe("TeeSwatch", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "TeeSwatch", "tee-swatch.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "TeeSwatch", "tee-swatch-dark.png");
  });
});

import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../previewScreenshot";

test.describe("HoleStrip", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "HoleStrip", "hole-strip.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "HoleStrip", "hole-strip-dark.png");
  });
});

import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../previewScreenshot";

test.describe("BrandMark", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "BrandMark", "brand-mark.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "BrandMark", "brand-mark-dark.png");
  });
});

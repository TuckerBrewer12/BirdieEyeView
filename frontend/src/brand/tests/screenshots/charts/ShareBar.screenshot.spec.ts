import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../previewScreenshot";

test.describe("ShareBar", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "ShareBar", "share-bar.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "ShareBar", "share-bar-dark.png");
  });
});

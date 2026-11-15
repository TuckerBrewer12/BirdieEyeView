import { test } from "@playwright/test";
import { BrandKitRobot } from "../../BrandKit.robot";
import { capturePreview, enableDark } from "../../previewScreenshot";

test.describe("PhotoSourceSheet", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "PhotoSourceSheet", "photo-source-sheet.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "PhotoSourceSheet", "photo-source-sheet-dark.png");
  });

  test("open on a phone", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 664 });
    const kit = new BrandKitRobot(page);
    await kit.open("PhotoSourceSheet");
    await kit.tap("Add scorecard photo");
    await kit.sees("[data-slot=action-sheet-content]");
    await kit.captureFrame("photo-source-sheet-open.png");
  });
});

import { test } from "@playwright/test";
import { capturePreviewLightAndDark } from "../../previewScreenshot";
import { BrandKitRobot } from "../../BrandKit.robot";

test.describe("PhotoSourceSheet", () => {
  test("light and dark", async ({ page }) => {
    await capturePreviewLightAndDark(page, "PhotoSourceSheet", "photo-source-sheet");
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

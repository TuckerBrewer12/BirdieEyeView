import { test } from "@playwright/test";
import { BrandKitRobot } from "../../../../brand/tests/BrandKit.robot";
import { capturePreview, enableDark } from "../../../../brand/tests/previewScreenshot";

test.describe("ScanUploadStep", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "ScanUploadStep", "scan-upload-step.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "ScanUploadStep", "scan-upload-step-dark.png");
  });

  // The phone app's picker: Add Scorecard opens the action sheet over the screen.
  test("phone action sheet", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 664 });
    const kit = new BrandKitRobot(page);
    await kit.open("ScanUploadStep");
    await kit.tap("Add Scorecard");
    await kit.sees("[data-slot=action-sheet-content]");
    await kit.captureFrame("scan-upload-step-action-sheet.png");
  });
});

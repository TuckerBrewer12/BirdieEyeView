import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../../../brand/tests/previewScreenshot";

test.describe("ScanPhotoStep", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "ScanPhotoStep", "scan-photo-step.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "ScanPhotoStep", "scan-photo-step-dark.png");
  });
});

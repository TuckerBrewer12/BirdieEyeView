import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../../../brand/tests/previewScreenshot";

test.describe("ScanUploadStep", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "ScanUploadStep", "scan-upload-step.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "ScanUploadStep", "scan-upload-step-dark.png");
  });
});

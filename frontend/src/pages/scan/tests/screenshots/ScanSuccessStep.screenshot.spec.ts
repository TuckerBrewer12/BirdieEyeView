import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../../../brand/tests/previewScreenshot";

test.describe("ScanSuccessStep", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "ScanSuccessStep", "scan-success-step.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "ScanSuccessStep", "scan-success-step-dark.png");
  });
});

import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../../../brand/tests/previewScreenshot";

test.describe("ScanProcessingStep", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "ScanProcessingStep", "scan-processing-step.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "ScanProcessingStep", "scan-processing-step-dark.png");
  });
});

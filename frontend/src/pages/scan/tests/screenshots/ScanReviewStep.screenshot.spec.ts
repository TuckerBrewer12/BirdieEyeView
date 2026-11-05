import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../../../brand/tests/previewScreenshot";

test.describe("ScanReviewStep", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "ScanReviewStep", "scan-review-step.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "ScanReviewStep", "scan-review-step-dark.png");
  });
});

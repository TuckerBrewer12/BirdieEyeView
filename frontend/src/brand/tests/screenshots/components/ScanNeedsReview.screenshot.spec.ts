import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../previewScreenshot";

test.describe("ScanNeedsReview", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "ScanNeedsReview", "scan-needs-review.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "ScanNeedsReview", "scan-needs-review-dark.png");
  });
});

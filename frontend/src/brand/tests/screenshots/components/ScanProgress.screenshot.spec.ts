import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../previewScreenshot";

test.describe("ScanProgress", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "ScanProgress", "scan-progress.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "ScanProgress", "scan-progress-dark.png");
  });
});

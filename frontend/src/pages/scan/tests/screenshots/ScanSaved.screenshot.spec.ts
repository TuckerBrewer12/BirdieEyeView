import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../../../brand/tests/previewScreenshot";

test.describe("ScanSaved", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "ScanSaved", "scan-saved.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "ScanSaved", "scan-saved-dark.png");
  });
});

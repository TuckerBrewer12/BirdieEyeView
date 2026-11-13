import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../../../brand/tests/previewScreenshot";

test.describe("ScanCardForm", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "ScanCardForm", "scan-card-form.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "ScanCardForm", "scan-card-form-dark.png");
  });
});

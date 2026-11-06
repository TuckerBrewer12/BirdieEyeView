import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../../../brand/tests/previewScreenshot";

test.describe("ScanSetupStep", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "ScanSetupStep", "scan-setup-step.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "ScanSetupStep", "scan-setup-step-dark.png");
  });
});

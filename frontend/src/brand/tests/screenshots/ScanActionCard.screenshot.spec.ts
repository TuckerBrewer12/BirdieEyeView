import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../previewScreenshot";

test.describe("ScanActionCard", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "ScanActionCard", "scan-action-card.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "ScanActionCard", "scan-action-card-dark.png");
  });
});

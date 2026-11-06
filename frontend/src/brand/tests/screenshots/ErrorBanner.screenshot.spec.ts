import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../previewScreenshot";

test.describe("ErrorBanner", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "ErrorBanner", "error-banner.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "ErrorBanner", "error-banner-dark.png");
  });
});

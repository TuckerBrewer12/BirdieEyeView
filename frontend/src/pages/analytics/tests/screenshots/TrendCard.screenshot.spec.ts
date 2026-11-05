import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../../../brand/tests/previewScreenshot";

test.describe("TrendCard", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "TrendCard", "trend-card.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "TrendCard", "trend-card-dark.png");
  });
});

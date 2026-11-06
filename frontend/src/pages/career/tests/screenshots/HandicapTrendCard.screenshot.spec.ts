import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../../../brand/tests/previewScreenshot";

test.describe("HandicapTrendCard", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "HandicapTrendCard", "handicap-trend-card.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "HandicapTrendCard", "handicap-trend-card-dark.png");
  });
});

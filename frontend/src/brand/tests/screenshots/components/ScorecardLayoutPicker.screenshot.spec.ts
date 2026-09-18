import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../previewScreenshot";

test.describe("ScorecardLayoutPicker", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "ScorecardLayoutPicker", "scorecard-layout-picker.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "ScorecardLayoutPicker", "scorecard-layout-picker-dark.png");
  });
});

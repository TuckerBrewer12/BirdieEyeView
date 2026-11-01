import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../../../brand/tests/previewScreenshot";

test.describe("HandicapSection", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "HandicapSection", "handicap-section.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "HandicapSection", "handicap-section-dark.png");
  });
});

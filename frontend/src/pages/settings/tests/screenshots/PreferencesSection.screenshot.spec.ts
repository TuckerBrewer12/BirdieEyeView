import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../../../brand/tests/previewScreenshot";

test.describe("PreferencesSection", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "PreferencesSection", "preferences-section.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "PreferencesSection", "preferences-section-dark.png");
  });
});

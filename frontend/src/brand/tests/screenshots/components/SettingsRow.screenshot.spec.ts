import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../previewScreenshot";

test.describe("SettingsRow", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "SettingsRow", "settings-row.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "SettingsRow", "settings-row-dark.png");
  });
});

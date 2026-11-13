import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../previewScreenshot";

test.describe("ActionBar", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "ActionBar", "action-bar.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "ActionBar", "action-bar-dark.png");
  });
});

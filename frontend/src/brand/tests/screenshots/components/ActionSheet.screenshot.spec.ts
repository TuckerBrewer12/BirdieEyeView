import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../previewScreenshot";

test.describe("ActionSheet", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "ActionSheet", "action-sheet.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "ActionSheet", "action-sheet-dark.png");
  });
});

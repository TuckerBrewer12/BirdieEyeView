import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../../../brand/tests/previewScreenshot";

test.describe("UnsavedChangesSheet", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "UnsavedChangesSheet", "unsaved-changes-sheet.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "UnsavedChangesSheet", "unsaved-changes-sheet-dark.png");
  });
});

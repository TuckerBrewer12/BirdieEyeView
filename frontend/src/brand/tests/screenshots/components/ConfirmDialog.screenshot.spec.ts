import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../previewScreenshot";

test.describe("ConfirmDialog", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "ConfirmDialog", "confirm-dialog.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "ConfirmDialog", "confirm-dialog-dark.png");
  });
});

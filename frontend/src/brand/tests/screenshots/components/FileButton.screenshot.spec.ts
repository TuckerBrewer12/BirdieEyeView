import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../previewScreenshot";

test.describe("FileButton", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "FileButton", "file-button.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "FileButton", "file-button-dark.png");
  });
});

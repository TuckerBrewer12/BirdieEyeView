import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../previewScreenshot";

test.describe("FileChip", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "FileChip", "file-chip.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "FileChip", "file-chip-dark.png");
  });
});

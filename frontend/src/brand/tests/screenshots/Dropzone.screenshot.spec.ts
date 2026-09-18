import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../previewScreenshot";

test.describe("Dropzone", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "Dropzone", "dropzone.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "Dropzone", "dropzone-dark.png");
  });
});

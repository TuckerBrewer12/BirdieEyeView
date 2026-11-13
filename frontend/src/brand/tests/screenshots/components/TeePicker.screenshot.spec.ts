import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../previewScreenshot";

test.describe("TeePicker", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "TeePicker", "tee-picker.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "TeePicker", "tee-picker-dark.png");
  });
});

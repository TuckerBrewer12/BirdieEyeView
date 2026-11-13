import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../previewScreenshot";

test.describe("LinePicker", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "LinePicker", "line-picker.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "LinePicker", "line-picker-dark.png");
  });
});

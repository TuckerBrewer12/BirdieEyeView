import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../../../brand/tests/previewScreenshot";

test.describe("CareerWindowPicker", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "CareerWindowPicker", "career-window-picker.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "CareerWindowPicker", "career-window-picker-dark.png");
  });
});

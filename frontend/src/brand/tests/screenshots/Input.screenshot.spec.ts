import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../previewScreenshot";

test.describe("Input", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "Input", "input.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "Input", "input-dark.png");
  });
});

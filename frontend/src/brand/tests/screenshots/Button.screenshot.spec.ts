import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../previewScreenshot";

test.describe("Button", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "Button", "button.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "Button", "button-dark.png");
  });
});

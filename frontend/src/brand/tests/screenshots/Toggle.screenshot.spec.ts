import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../previewScreenshot";

test.describe("Toggle", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "Toggle", "toggle.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "Toggle", "toggle-dark.png");
  });
});

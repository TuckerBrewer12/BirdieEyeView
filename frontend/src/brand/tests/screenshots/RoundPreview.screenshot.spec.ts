import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../previewScreenshot";

test.describe("RoundPreview", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "RoundPreview", "round-preview.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "RoundPreview", "round-preview-dark.png");
  });
});

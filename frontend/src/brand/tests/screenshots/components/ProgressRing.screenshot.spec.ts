import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../previewScreenshot";

test.describe("ProgressRing", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "ProgressRing", "progress-ring.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "ProgressRing", "progress-ring-dark.png");
  });
});

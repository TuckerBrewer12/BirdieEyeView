import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../previewScreenshot";

test.describe("HoleToParBars", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "HoleToParBars", "hole-to-par-bars.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "HoleToParBars", "hole-to-par-bars-dark.png");
  });
});

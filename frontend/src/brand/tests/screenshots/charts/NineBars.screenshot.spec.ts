import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../previewScreenshot";

test.describe("NineBars", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "NineBars", "nine-bars.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "NineBars", "nine-bars-dark.png");
  });
});

import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../previewScreenshot";

test.describe("Meter", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "Meter", "meter.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "Meter", "meter-dark.png");
  });
});

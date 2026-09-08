import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../previewScreenshot";

test.describe("Alert", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "Alert", "alert.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "Alert", "alert-dark.png");
  });
});

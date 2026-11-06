import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../previewScreenshot";

test.describe("Panel", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "Panel", "panel.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "Panel", "panel-dark.png");
  });
});

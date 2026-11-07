import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../previewScreenshot";

test.describe("BottomNav", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "BottomNav", "bottom-nav.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "BottomNav", "bottom-nav-dark.png");
  });
});

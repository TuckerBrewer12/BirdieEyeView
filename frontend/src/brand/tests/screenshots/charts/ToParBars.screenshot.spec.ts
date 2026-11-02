import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../previewScreenshot";

test.describe("ToParBars", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "ToParBars", "to-par-bars.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "ToParBars", "to-par-bars-dark.png");
  });
});

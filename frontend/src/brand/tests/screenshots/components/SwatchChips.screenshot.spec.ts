import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../previewScreenshot";

test.describe("SwatchChips", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "SwatchChips", "swatch-chips.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "SwatchChips", "swatch-chips-dark.png");
  });
});

import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../previewScreenshot";

test.describe("Sheet", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "Sheet", "sheet.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "Sheet", "sheet-dark.png");
  });
});

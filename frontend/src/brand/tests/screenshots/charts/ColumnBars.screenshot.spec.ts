import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../previewScreenshot";

test.describe("ColumnBars", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "ColumnBars", "column-bars.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "ColumnBars", "column-bars-dark.png");
  });
});

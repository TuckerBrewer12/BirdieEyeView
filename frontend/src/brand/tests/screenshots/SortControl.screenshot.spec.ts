import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../previewScreenshot";

test.describe("SortControl", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "SortControl", "sort-control.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "SortControl", "sort-control-dark.png");
  });
});

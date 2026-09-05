import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../previewScreenshot";

test.describe("SearchField", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "SearchField", "search-field.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "SearchField", "search-field-dark.png");
  });
});

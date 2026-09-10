import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../previewScreenshot";

test.describe("Collection", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "Collection", "collection.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "Collection", "collection-dark.png");
  });
});

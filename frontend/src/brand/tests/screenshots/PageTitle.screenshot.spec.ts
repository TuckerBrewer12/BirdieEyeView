import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../previewScreenshot";

test.describe("PageTitle", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "PageTitle", "page-title.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "PageTitle", "page-title-dark.png");
  });
});

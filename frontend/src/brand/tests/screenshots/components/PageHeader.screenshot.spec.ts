import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../previewScreenshot";

test.describe("PageHeader", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "PageHeader", "page-header.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "PageHeader", "page-header-dark.png");
  });
});

import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../previewScreenshot";

test.describe("LoadError", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "LoadError", "load-error.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "LoadError", "load-error-dark.png");
  });
});

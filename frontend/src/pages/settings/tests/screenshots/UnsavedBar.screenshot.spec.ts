import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../../../brand/tests/previewScreenshot";

test.describe("UnsavedBar", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "UnsavedBar", "unsaved-bar.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "UnsavedBar", "unsaved-bar-dark.png");
  });
});

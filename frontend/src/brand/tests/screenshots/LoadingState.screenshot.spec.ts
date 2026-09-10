import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../previewScreenshot";

test.describe("LoadingState", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "LoadingState", "loading-state.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "LoadingState", "loading-state-dark.png");
  });
});

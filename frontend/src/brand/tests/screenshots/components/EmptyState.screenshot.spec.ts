import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../previewScreenshot";

test.describe("EmptyState", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "EmptyState", "empty-state.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "EmptyState", "empty-state-dark.png");
  });
});

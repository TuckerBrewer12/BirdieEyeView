import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../previewScreenshot";

test.describe("ToggleGroup", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "ToggleGroup", "toggle-group.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "ToggleGroup", "toggle-group-dark.png");
  });
});

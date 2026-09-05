import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../previewScreenshot";

test.describe("FilterChip", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "FilterChip", "filter-chip.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "FilterChip", "filter-chip-dark.png");
  });
});
